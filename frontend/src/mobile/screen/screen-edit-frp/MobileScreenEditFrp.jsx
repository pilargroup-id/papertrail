import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

import api from '../../../services/api.js'
import { ChevronLeft } from '../../../components/layoute/TemplateIcons.jsx'
import MobileTabsInformation from './tabs-edit-mobile/TabsInformation.jsx'
import MobileTabsItems from './tabs-edit-mobile/TabsItems.jsx'
import MobileTabsVendor from './tabs-edit-mobile/TabsVendor.jsx'
import MobileTabsAttachment from './tabs-edit-mobile/TabsAttachment.jsx'

const getTodayDateValue = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const date = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${date}`
}

const editInitialItem = () => ({
  budget_id: '',
  memo: '',
  quantity: '1',
  unit_price: '',
})

const editInitialFormValues = () => ({
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
  items: [editInitialItem()],
  notes: '',
})

const editInitialAttachmentDraft = () => ({
  files: [],
  documentTypeId: '',
})

const editAttachmentFileDraft = (file) => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
  file,
  previewUrl: URL.createObjectURL(file),
})

const initialRequesterInfo = {
  company: '',
  division: '',
  request_by: '',
}

const frpTabs = [
  {
    id: 'information',
    label: 'Information',
  },
  {
    id: 'vendor',
    label: 'Vendor',
  },
  {
    id: 'items',
    label: 'Items',
  },
  {
    id: 'attachment',
    label: 'Attachment',
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

function mapNameOptions(rows, fallbackName) {
  return rows.map((row) => {
    const id = getFirstValue(row, ['id'])
    const name = getFirstValue(row, ['name'], `${fallbackName} #${id ?? '-'}`)

    return {
      value: id,
      label: name,
    }
  })
}

function stringifyOptionValues(options) {
  return options.map((option) => ({
    ...option,
    value: String(option.value),
  }))
}

function mapBudgetOptions(budgets) {
  return budgets.map((budget) => {
    const id = getFirstValue(budget, ['id', 'budget_id'])
    const projectName = getFirstValue(budget, ['project_name', 'name'], `Budget #${id ?? '-'}`)
    const budgetAmount = getFirstValue(budget, ['budget_amount', 'amount'])
    const remaining = getFirstValue(budget, ['budget_remaining', 'remaining_amount'])

    return {
      value: id,
      label: projectName,
      meta: {
        budgetAmount,
        budgetRemaining: remaining,
      },
    }
  })
}

function hasOptionValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return true
  }

  return options.some((option) => String(option.value) === String(value))
}

function ensureOption(options, value, label, extra = {}) {
  if (hasOptionValue(options, value)) {
    return options
  }

  return [
    {
      value,
      label: label || `Selected #${value}`,
      ...extra,
    },
    ...options,
  ]
}

function ensureOptions(options, values, getLabel) {
  return values.reduce((currentOptions, value, index) => {
    const optionValue = typeof value === 'object' ? value?.value : value
    const optionLabel = typeof getLabel === 'function' ? getLabel(value, index) : ''

    return ensureOption(currentOptions, optionValue, optionLabel)
  }, options)
}

function getAuthUser(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function getEditFrpId(response) {
  return response?.data?.id ?? response?.data?.data?.id ?? response?.id ?? ''
}

function getFrpDetailFromResponse(response) {
  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ]

  return candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate),
  ) ?? null
}

function formatDateInputValue(value) {
  if (!value) {
    return ''
  }

  return String(value).slice(0, 10)
}

function mapFrpItemsToFormItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [editInitialItem()]
  }

  return items.map((item) => ({
    budget_id: getFirstValue(item, ['budget_id', 'budgetId'], ''),
    memo: getFirstValue(item, ['memo', 'description'], ''),
    quantity: String(getFirstValue(item, ['quantity'], '1')),
    unit_price: String(getFirstValue(item, ['unit_price', 'unitPrice'], '')),
  }))
}

function getDocumentTypeIds(frp) {
  if (Array.isArray(frp?.document_type_ids)) {
    return frp.document_type_ids.map(String)
  }

  if (Array.isArray(frp?.document_types)) {
    return frp.document_types
      .map((documentType) =>
        getFirstValue(documentType, ['document_type_id', 'frp_document_type_id', 'id'], ''),
      )
      .filter((documentTypeId) => documentTypeId !== '')
      .map(String)
  }

  if (Array.isArray(frp?.documents)) {
    return frp.documents
      .map((document) =>
        getFirstValue(document, ['document_type_id', 'frp_document_type_id', 'id'], ''),
      )
      .filter((documentTypeId) => documentTypeId !== '')
      .map(String)
  }

  return []
}

function getDocumentTypesFromFrp(frp) {
  if (Array.isArray(frp?.document_types)) {
    return frp.document_types
  }

  if (Array.isArray(frp?.documents)) {
    return frp.documents
  }

  return []
}

function mapFrpToFormValues(frp) {
  return {
    frp_date: formatDateInputValue(getFirstValue(frp, ['frp_date', 'created_at'], getTodayDateValue())),
    description: getFirstValue(frp, ['description'], ''),
    currency_code: getFirstValue(frp, ['currency_code'], 'IDR'),
    exchange_rate: String(getFirstValue(frp, ['exchange_rate'], '1')),
    vendor_id: getFirstValue(frp, ['vendor_id', 'vendorId'], ''),
    vendor_bank_account_id: getFirstValue(
      frp,
      ['vendor_bank_account_id', 'vendorBankAccountId'],
      '',
    ),
    internal_po_number: getFirstValue(frp, ['internal_po_number'], ''),
    external_document_type_id: String(
      getFirstValue(frp, ['external_document_type_id', 'externalDocumentTypeId'], ''),
    ),
    external_document_number: getFirstValue(frp, ['external_document_number'], ''),
    payment_method_id: getFirstValue(frp, ['payment_method_id', 'paymentMethodId'], ''),
    payment_date: formatDateInputValue(getFirstValue(frp, ['payment_date'], '')),
    destination_bank_name: getFirstValue(
      frp,
      ['destination_bank_name', 'destination_bank_name_snapshot', 'bank_name_snapshot'],
      '',
    ),
    destination_bank_account: getFirstValue(
      frp,
      ['destination_bank_account', 'destination_bank_account_snapshot', 'account_number_snapshot'],
      '',
    ),
    destination_bank_account_name: getFirstValue(
      frp,
      [
        'destination_bank_account_name',
        'destination_bank_account_name_snapshot',
        'account_name_snapshot',
      ],
      '',
    ),
    document_type_ids: getDocumentTypeIds(frp),
    items: mapFrpItemsToFormItems(frp?.items),
    notes: getFirstValue(frp, ['notes'], ''),
  }
}

function ensureBudgetOptionsForItems(options, items) {
  if (!Array.isArray(items)) {
    return options
  }

  const budgetOptions = items.map((item) => {
    const code = getFirstValue(item, ['budget_code_snapshot', 'budget_code'], '')
    const name = getFirstValue(
      item,
      ['budget_project_name_snapshot', 'budget_name_snapshot', 'project_name', 'name'],
      '',
    )

    return {
      value: getFirstValue(item, ['budget_id', 'budgetId'], ''),
      label: [code, name].filter(Boolean).join(' - '),
    }
  })

  return ensureOptions(options, budgetOptions, (item) => item.label)
}

function ensureDocumentTypeOptions(options, frp) {
  const documentTypes = getDocumentTypesFromFrp(frp).map((documentType) => ({
    value: getFirstValue(documentType, ['document_type_id', 'frp_document_type_id', 'id'], ''),
    label: getFirstValue(
      documentType,
      ['document_name_snapshot', 'document_name', 'document_type_name_snapshot', 'name'],
      '',
    ),
  }))

  return ensureOptions(options, documentTypes, (documentType) => documentType.label)
}

function getFrpAttachments(frp) {
  if (Array.isArray(frp?.attachments)) {
    return frp.attachments
  }

  return []
}

function getAttachmentUploadStatus(attachment) {
  return String(attachment?.upload_status ?? attachment?.status ?? '').toUpperCase()
}

function isActiveAttachment(attachment) {
  return getAttachmentUploadStatus(attachment) !== 'CANCELED'
}

function isUploadedAttachment(attachment) {
  const uploadStatus = getAttachmentUploadStatus(attachment)

  return !uploadStatus || uploadStatus === 'UPLOADED'
}

function getAttachmentId(attachment) {
  return attachment?.attachment_id ?? attachment?.id
}

function getInitialAttachmentDocumentTypeId(frp, formValues) {
  const firstRequiredDocumentTypeId = formValues.document_type_ids[0]

  if (firstRequiredDocumentTypeId) {
    return String(firstRequiredDocumentTypeId)
  }

  const firstAttachmentDocumentTypeId = getFrpAttachments(frp)
    .filter(isActiveAttachment)
    .map((attachment) => getFirstValue(attachment, ['document_type_id', 'frp_document_type_id'], ''))
    .find((documentTypeId) => documentTypeId !== '')

  return String(firstAttachmentDocumentTypeId || '')
}

function getPrimaryItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  return items.find((item) => Number(item?.is_primary) === 1) || items[0]
}

function getUserRequesterInfo(user = {}) {
  const primaryCompany = getPrimaryItem(user.companies)
  const primaryDepartment = getPrimaryItem(user.departments)
  const companyCode = user.company_code ?? primaryCompany?.code
  const companyName = user.company ?? primaryCompany?.name ?? primaryCompany?.company_name
  const departmentCode = user.department_code ?? primaryDepartment?.code
  const departmentName =
    user.department ?? primaryDepartment?.name ?? primaryDepartment?.department_name

  return {
    company: [companyCode, companyName].filter(Boolean).join(' - '),
    division: [departmentCode, departmentName].filter(Boolean).join(' - '),
    request_by: user.name ?? user.full_name ?? user.username ?? '',
  }
}

function getFrpRequesterInfo(frp = {}, fallbackUser = {}) {
  const fallbackRequesterInfo = getUserRequesterInfo(fallbackUser)
  const companyCode = getFirstValue(frp, ['company_code_snapshot', 'company_code'], '')
  const companyName = getFirstValue(frp, ['company_name_snapshot', 'company_name'], '')
  const departmentCode = getFirstValue(frp, ['department_code_snapshot', 'department_code'], '')
  const departmentName = getFirstValue(frp, ['department_name_snapshot', 'department_name'], '')
  const requestedBy = getFirstValue(
    frp,
    ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name'],
    '',
  )

  return {
    company: [companyCode, companyName].filter(Boolean).join(' - ') || fallbackRequesterInfo.company,
    division:
      [departmentCode, departmentName].filter(Boolean).join(' - ') ||
      fallbackRequesterInfo.division,
    request_by: requestedBy || fallbackRequesterInfo.request_by,
  }
}

function MobileScreenEditFrp({
  isOpen = false,
  mode = 'dialog',
  eyebrow = 'Form request payment',
  title = 'Edit FRP',
  frp = null,
  onClose,
  onUpdated,
}) {
  const [formValues, setFormValues] = useState(editInitialFormValues)
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
  const [requesterInfo, setRequesterInfo] = useState(initialRequesterInfo)
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [attachmentDraft, setAttachmentDraft] = useState(editInitialAttachmentDraft)
  const [existingAttachments, setExistingAttachments] = useState([])
  const [attachmentActionError, setAttachmentActionError] = useState('')
  const attachmentFilesRef = useRef([])

  const revokeAttachmentPreviewUrls = (files = attachmentFilesRef.current) => {
    files.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
  }

  const resetDialogState = () => {
    revokeAttachmentPreviewUrls()
    setFormValues(editInitialFormValues())
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
    setRequesterInfo(initialRequesterInfo)
    setIsOptionsLoading(false)
    setOptionsError('')
    setAttachmentDraft(editInitialAttachmentDraft())
    setExistingAttachments([])
    setAttachmentActionError('')
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

  const updateDocumentTypeIds = (value) => {
    const normalizedValue = value.map(String)

    updateValue('document_type_ids', normalizedValue)
    setAttachmentDraft((currentDraft) => {
      const currentDocumentTypeId = String(currentDraft.documentTypeId || '')

      if (normalizedValue.length === 0) {
        return currentDraft
      }

      if (currentDocumentTypeId && normalizedValue.includes(currentDocumentTypeId)) {
        return currentDraft
      }

      return {
        ...currentDraft,
        documentTypeId: normalizedValue[0] || '',
      }
    })
  }

  const updateAttachmentDocumentType = (value) => {
    setAttachmentDraft((currentDraft) => ({
      ...currentDraft,
      documentTypeId: value,
    }))

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      attachment_document_type_id: '',
    }))
  }

  const updateAttachmentFile = (files) => {
    const maxFileSize = 10 * 1024 * 1024
    const selectedFiles = Array.from(files ?? [])

    if (selectedFiles.length === 0) {
      return
    }

    const oversizedFiles = selectedFiles.filter((file) => file.size > maxFileSize)

    if (oversizedFiles.length > 0) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        attachment_file: 'Ukuran setiap attachment maksimal 10 MB.',
      }))
      return
    }

    setAttachmentDraft((currentDraft) => ({
      ...currentDraft,
      files: [...currentDraft.files, ...selectedFiles.map(editAttachmentFileDraft)],
      documentTypeId:
        currentDraft.documentTypeId || formValues.document_type_ids.map(String)[0] || '',
    }))

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      attachment_file: '',
    }))
  }

  const removeAttachmentDraft = (attachmentId) => {
    setAttachmentDraft((currentDraft) => {
      const removedFiles = currentDraft.files.filter((item) => item.id === attachmentId)
      revokeAttachmentPreviewUrls(removedFiles)

      return {
        ...currentDraft,
        files: currentDraft.files.filter((item) => item.id !== attachmentId),
      }
    })

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      attachment_file: '',
    }))
  }

  const previewAttachmentDraft = (previewUrl) => {
    if (!previewUrl) {
      return
    }

    window.open(previewUrl, '_blank', 'noopener,noreferrer')
  }

  const previewExistingAttachment = async (attachment) => {
    const frpId = frp?.id
    const attachmentId = getAttachmentId(attachment)

    if (!isUploadedAttachment(attachment)) {
      setAttachmentActionError('Attachment belum selesai diupload.')
      return
    }

    if (!frpId || !attachmentId) {
      setAttachmentActionError('Attachment tidak dapat dibuka.')
      return
    }

    setAttachmentActionError('')

    try {
      const response = await api.frp.attachments.downloadUrl(frpId, attachmentId)
      const downloadUrl = response?.data?.download_url ?? response?.download_url

      if (!downloadUrl) {
        throw new Error('URL attachment tidak tersedia.')
      }

      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setAttachmentActionError(error.message || 'Gagal membuka attachment.')
    }
  }

  const removeExistingAttachment = async (attachment) => {
    const frpId = frp?.id
    const attachmentId = getAttachmentId(attachment)

    if (!frpId || !attachmentId) {
      setAttachmentActionError('Attachment tidak dapat dihapus.')
      return
    }

    setAttachmentActionError('')

    try {
      await api.frp.attachments.cancel(frpId, attachmentId)
      setExistingAttachments((currentAttachments) =>
        currentAttachments.filter((currentAttachment) => getAttachmentId(currentAttachment) !== attachmentId),
      )
    } catch (error) {
      setAttachmentActionError(error.message || 'Gagal menghapus attachment.')
    }
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
      items: [...currentValues.items, editInitialItem()],
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

    const frpId = frp?.id
    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const [
          frpDetailResponse,
          authResponse,
          vendorsResponse,
          vendorBanksResponse,
          externalDocumentTypesResponse,
          paymentMethodsResponse,
          frpDocumentTypesResponse,
          budgetsResponse,
        ] = await Promise.all([
          frpId === undefined || frpId === null
            ? Promise.resolve(frp)
            : api.frp.detail(frpId, undefined, {
                signal: controller.signal,
              }),
          api.auth.me({
            signal: controller.signal,
          }),
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
        const frpDetail = getFrpDetailFromResponse(frpDetailResponse) ?? frp ?? {}
        const authUser = getAuthUser(authResponse)
        const nextFormValues = mapFrpToFormValues(frpDetail)
        const nextVendorOptions = ensureOption(
          mapVendorOptions(getRowsFromResponse(vendorsResponse)),
          nextFormValues.vendor_id,
          [
            getFirstValue(frpDetail, ['vendor_code_snapshot', 'vendor_code'], ''),
            getFirstValue(frpDetail, ['vendor_name_snapshot', 'vendor_name'], ''),
          ]
            .filter(Boolean)
            .join(' - '),
        )
        const nextVendorBankOptions = ensureOption(
          mapVendorBankOptions(getRowsFromResponse(vendorBanksResponse)),
          nextFormValues.vendor_bank_account_id,
          [
            nextFormValues.destination_bank_name,
            nextFormValues.destination_bank_account,
            nextFormValues.destination_bank_account_name,
          ]
            .filter(Boolean)
            .join(' - '),
          {
            vendorId: nextFormValues.vendor_id,
            meta: {
              bankName: nextFormValues.destination_bank_name,
              accountNumber: nextFormValues.destination_bank_account,
              accountName: nextFormValues.destination_bank_account_name,
            },
          },
        )
        const nextExternalDocumentTypeOptions = ensureOption(
          stringifyOptionValues(
            mapCodeNameOptions(getRowsFromResponse(externalDocumentTypesResponse), 'External document'),
          ),
          nextFormValues.external_document_type_id,
          [
            getFirstValue(frpDetail, ['external_document_type_code_snapshot'], ''),
            getFirstValue(frpDetail, ['external_document_type_name_snapshot'], ''),
          ]
            .filter(Boolean)
            .join(' - '),
        )
        const nextPaymentMethodOptions = ensureOption(
          mapCodeNameOptions(getRowsFromResponse(paymentMethodsResponse), 'Payment method'),
          nextFormValues.payment_method_id,
          [
            getFirstValue(frpDetail, ['payment_method_code_snapshot'], ''),
            getFirstValue(frpDetail, ['payment_method_name_snapshot'], ''),
          ]
            .filter(Boolean)
            .join(' - '),
        )
        const nextFrpDocumentTypeOptions = ensureDocumentTypeOptions(
          mapNameOptions(getRowsFromResponse(frpDocumentTypesResponse), 'FRP document'),
          frpDetail,
        )
        const nextBudgetOptions = ensureBudgetOptionsForItems(
          mapBudgetOptions(getRowsFromResponse(budgetsResponse)),
          frpDetail?.items,
        )
        const nextExistingAttachments = getFrpAttachments(frpDetail).filter(isActiveAttachment)

        setFormValues(nextFormValues)
        setRequesterInfo(getFrpRequesterInfo(frpDetail, authUser))
        setVendorOptions(nextVendorOptions)
        setVendorBankOptions(nextVendorBankOptions)
        setExternalDocumentTypeOptions(nextExternalDocumentTypeOptions)
        setPaymentMethodOptions(nextPaymentMethodOptions)
        setFrpDocumentTypeOptions(nextFrpDocumentTypeOptions)
        setBudgetOptions(nextBudgetOptions)
        setExistingAttachments(nextExistingAttachments)
        setAttachmentDraft({
          files: [],
          documentTypeId: getInitialAttachmentDocumentTypeId(frpDetail, nextFormValues),
        })
        setAttachmentActionError('')
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
        setRequesterInfo(initialRequesterInfo)
        setExistingAttachments([])
        setAttachmentDraft(editInitialAttachmentDraft())
        setAttachmentActionError('')
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
  }, [frp, isOpen])

  useEffect(() => {
    attachmentFilesRef.current = attachmentDraft.files
  }, [attachmentDraft.files])

  useEffect(() => {
    return () => {
      revokeAttachmentPreviewUrls()
    }
  }, [])

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

    if (attachmentDraft.files.length > 0 && !attachmentDraft.documentTypeId) {
      nextFieldErrors.attachment_document_type_id = 'Attachment document type wajib dipilih.'
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
        nextFieldErrors.external_document_type_id ||
        nextFieldErrors.external_document_number
      ) {
        setActiveTab('information')
      } else if (
        nextFieldErrors.vendor_id ||
        nextFieldErrors.payment_method_id ||
        nextFieldErrors.payment_date ||
        nextFieldErrors.currency_code ||
        nextFieldErrors.exchange_rate ||
        nextFieldErrors.destination_bank_name ||
        nextFieldErrors.destination_bank_account ||
        nextFieldErrors.destination_bank_account_name
      ) {
        setActiveTab('vendor')
      } else if (
        nextFieldErrors.document_type_ids ||
        nextFieldErrors.attachment_document_type_id ||
        nextFieldErrors.attachment_file
      ) {
        setActiveTab('attachment')
      } else {
        setActiveTab('items')
      }

      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const frpId = frp?.id

      if (frpId === undefined || frpId === null) {
        throw new Error('ID FRP tidak tersedia.')
      }

      const response = await api.frp.update(frpId, {
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

      if (attachmentDraft.files.length > 0) {
        const updatedFrpId = getEditFrpId(response) || frpId

        if (!updatedFrpId) {
          await onUpdated?.(response)
          handleClose()
          return
        }

        try {
          await Promise.all(
            attachmentDraft.files.map((attachment) =>
              api.frp.attachments.upload(updatedFrpId, {
                file: attachment.file,
                documentTypeId: attachmentDraft.documentTypeId,
              }),
            ),
          )
        } catch (error) {
          setActiveTab('attachment')
          throw new Error(error.message || 'FRP berhasil diperbarui, tetapi attachment gagal diupload.')
        }
      }

      await onUpdated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors(error.data.errors)
      }

      setSubmitError(error.message || 'Gagal memperbarui FRP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  const isScreenMode = mode === 'screen'
  const isFormDisabled = isSubmitting || isOptionsLoading
  const filteredVendorBankOptions = formValues.vendor_id
    ? vendorBankOptions.filter(
        (option) => !option.vendorId || String(option.vendorId) === String(formValues.vendor_id),
      )
    : vendorBankOptions
  const frpDocumentTypeDropdownOptions = frpDocumentTypeOptions.map((option) => ({
    ...option,
    value: String(option.value),
  }))
  const selectedFrpDocumentTypeIds = formValues.document_type_ids.map(String)
  const attachmentDocumentTypeOptions =
    selectedFrpDocumentTypeIds.length > 0
      ? frpDocumentTypeDropdownOptions.filter((option) =>
          selectedFrpDocumentTypeIds.includes(String(option.value)),
        )
      : frpDocumentTypeDropdownOptions
  const activeStepIndex = frpTabs.findIndex((tab) => tab.id === activeTab)
  const activeStepLabel = `Step ${activeStepIndex + 1} of ${frpTabs.length}`

  const renderActivePanel = () => {
    if (activeTab === 'information') {
      return (
        <MobileTabsInformation
          requesterInfo={requesterInfo}
          isOptionsLoading={isOptionsLoading}
          isFormDisabled={isFormDisabled}
          formValues={formValues}
          fieldErrors={fieldErrors}
          externalDocumentTypeOptions={externalDocumentTypeOptions}
          updateValue={updateValue}
        />
      )
    }

    if (activeTab === 'vendor') {
      return (
        <MobileTabsVendor
          formValues={formValues}
          fieldErrors={fieldErrors}
          isOptionsLoading={isOptionsLoading}
          isFormDisabled={isFormDisabled}
          vendorOptions={vendorOptions}
          filteredVendorBankOptions={filteredVendorBankOptions}
          paymentMethodOptions={paymentMethodOptions}
          updateValue={updateValue}
          handleVendorBankChange={handleVendorBankChange}
        />
      )
    }

    if (activeTab === 'attachment') {
      return (
        <MobileTabsAttachment
          formValues={formValues}
          fieldErrors={fieldErrors}
          isOptionsLoading={isOptionsLoading}
          isFormDisabled={isFormDisabled}
          frpDocumentTypeDropdownOptions={frpDocumentTypeDropdownOptions}
          attachmentDocumentTypeOptions={attachmentDocumentTypeOptions}
          attachmentDraft={attachmentDraft}
          existingAttachments={existingAttachments}
          attachmentActionError={attachmentActionError}
          updateDocumentTypeIds={updateDocumentTypeIds}
          updateAttachmentDocumentType={updateAttachmentDocumentType}
          updateAttachmentFile={updateAttachmentFile}
          removeAttachmentDraft={removeAttachmentDraft}
          previewAttachmentDraft={previewAttachmentDraft}
          previewExistingAttachment={previewExistingAttachment}
          removeExistingAttachment={removeExistingAttachment}
        />
      )
    }

    return (
      <MobileTabsItems
        formValues={formValues}
        fieldErrors={fieldErrors}
        isOptionsLoading={isOptionsLoading}
        isFormDisabled={isFormDisabled}
        budgetOptions={budgetOptions}
        attachmentDraft={attachmentDraft}
        existingAttachments={existingAttachments}
        attachmentActionError={attachmentActionError}
        updateItemValue={updateItemValue}
        removeItem={removeItem}
        addItem={addItem}
        removeAttachmentDraft={removeAttachmentDraft}
        previewAttachmentDraft={previewAttachmentDraft}
        previewExistingAttachment={previewExistingAttachment}
        removeExistingAttachment={removeExistingAttachment}
      />
    )
  }

  const formNode = (
    <form
      className={isScreenMode ? 'frp-mobile-create-page__form-node' : undefined}
      onSubmit={handleSubmit}
    >
          {!isScreenMode ? (
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">
                {eyebrow} · {activeStepLabel}
              </p>
              <h2 className="dashboard-popup__title" id="dialog-edit-frp-title">
                {title}
              </h2>
            </div>
          </div>
          ) : null}

          <div className={isScreenMode ? 'frp-mobile-create-page__body' : 'dashboard-popup__body'}>
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div
                    className={
                      isScreenMode
                        ? 'frp-dialog__tabbed-container frp-dialog__tabbed-container--mobile-create'
                        : 'frp-dialog__tabbed-container'
                    }
                  >
                    <div className="frp-dialog__tabs-shell">
                      <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        textColor="primary"
                        indicatorColor="primary"
                        aria-label="FRP tabs"
                        variant={isScreenMode ? 'scrollable' : 'fullWidth'}
                        scrollButtons={false}
                        allowScrollButtonsMobile
                        className="frp-dialog__tabs"
                        sx={{
                          minHeight: isScreenMode ? 38 : 44,
                          '& .MuiTabs-flexContainer': {
                            gap: isScreenMode ? '0.35rem' : '0.4rem',
                            justifyContent: isScreenMode ? 'flex-start' : 'initial',
                          },
                          '& .MuiTabs-indicator': {
                            display: isScreenMode ? 'none' : 'block',
                            height: 2,
                            borderRadius: 999,
                            backgroundColor: 'var(--primary-blue)',
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
                              minHeight: isScreenMode ? 36 : 44,
                              minWidth: isScreenMode ? 'auto' : undefined,
                              flex: isScreenMode ? '0 0 auto' : undefined,
                              borderRadius: isScreenMode ? '999px' : '10px 10px 0 0',
                              padding: isScreenMode ? '0.45rem 0.78rem' : undefined,
                              color: '#607089',
                              fontSize: isScreenMode ? '0.78rem' : '0.86rem',
                              fontWeight: 700,
                              letterSpacing: 0,
                              textTransform: 'none',
                              transition: 'background-color 0.2s ease, color 0.2s ease',
                              '&.Mui-selected': {
                                color: 'var(--primary-blue)',
                                backgroundColor: isScreenMode
                                  ? '#ffffff'
                                  : 'rgba(26, 42, 87, 0.08)',
                                boxShadow: isScreenMode
                                  ? '0 6px 14px rgba(16, 28, 54, 0.1)'
                                  : 'none',
                              },
                            }}
                          />
                        ))}
                      </Tabs>
                    </div>

                    <div
                      className="frp-dialog__panel"
                      id={`frp-panel-${activeTab}`}
                      role="tabpanel"
                      aria-labelledby={`frp-tab-${activeTab}`}
                    >
                      {renderActivePanel()}
                    </div>
                  </div>

                  {optionsError ? <p className="form-control__message">{optionsError}</p> : null}
                  {submitError ? <p className="form-control__message">{submitError}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div
            className={
              isScreenMode
                ? 'frp-mobile-create-page__actions'
                : 'dashboard-popup__actions'
            }
          >
            <button
              type="button"
              className={
                isScreenMode
                  ? 'frp-mobile-create-page__button frp-mobile-create-page__button--secondary'
                  : 'dashboard-popup__button dashboard-popup__button--secondary'
              }
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className={
                isScreenMode
                  ? 'frp-mobile-create-page__button frp-mobile-create-page__button--primary'
                  : 'dashboard-popup__button dashboard-popup__button--primary'
              }
              disabled={isFormDisabled}
            >
              {isSubmitting ? 'Updating...' : isOptionsLoading ? 'Loading...' : 'Update'}
            </button>
          </div>
    </form>
  )

  if (isScreenMode) {
    return (
      <section className="frp-mobile-detail-page frp-mobile-create-page" aria-label={title}>
        <header className="frp-mobile-create-page__header">
          <button
            className="frp-mobile-create-page__back"
            type="button"
            onClick={handleClose}
            aria-label="Kembali ke daftar FRP"
            disabled={isSubmitting}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="frp-mobile-create-page__heading">
            <p className="frp-mobile-create-page__eyebrow">
              {eyebrow} - {activeStepLabel}
            </p>
            <h2 className="frp-mobile-create-page__title">{title}</h2>
          </div>
        </header>

        <div className="register-user-popup entity-form-popup entity-form-popup--budget-type entity-form-popup--frp frp-mobile-create-page__form">
          {formNode}
        </div>
      </section>
    )
  }

  if (typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type entity-form-popup--frp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-frp-title"
        onClick={(event) => event.stopPropagation()}
      >
        {formNode}
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default MobileScreenEditFrp

