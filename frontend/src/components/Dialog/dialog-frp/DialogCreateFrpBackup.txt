import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { TrendingUp, XClose } from '../../layoute/TemplateIcons.jsx'
import TabsInformation from './tabs-create-frp/TabsInformation.jsx'
import TabsItems from './tabs-create-frp/TabsItems.jsx'
import TabsVendor from './tabs-create-frp/TabsVendor.jsx'

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

function isPositiveIntegerInput(value) {
  const normalizedValue = String(value ?? '').trim()
  const numberValue = Number(normalizedValue)

  return /^\d+$/.test(normalizedValue) && Number.isSafeInteger(numberValue) && numberValue > 0
}

function toNumber(value) {
  const normalizedValue = Number(value)

  return Number.isFinite(normalizedValue) ? normalizedValue : 0
}

function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return ''
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

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

const createInitialAttachmentDraft = () => ({
  files: [],
  documentTypeId: '',
})

const createAttachmentFileDraft = (file) => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
  file,
  previewUrl: URL.createObjectURL(file),
})

const initialRequesterInfo = {
  company: '',
  division: '',
  request_by: '',
  department_id: '',
  class_department_id: '',
}

const FRP_BUDGET_ACCESS_MODULE = 'FRP'
const CROSS_BUDGET_ACCESS_TYPE = 'CROSS_BUDGET'

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

function mapBudgetOptions(budgets) {
  return budgets.map((budget) => {
    const id = getFirstValue(budget, ['id', 'budget_id'])
    const code = getFirstValue(budget, ['budget_code', 'code'])
    const projectName = getFirstValue(budget, ['project_name', 'name'], `Budget #${id ?? '-'}`)
    const budgetAmount = getFirstValue(budget, ['budget_amount', 'amount'])
    const remaining = getFirstValue(budget, ['budget_remaining', 'remaining_amount'])
    const departmentCode = getFirstValue(
      budget,
      ['department_code_snapshot', 'department_code'],
    )
    const departmentName = getFirstValue(
      budget,
      ['department_name_snapshot', 'department_name'],
    )
    const departmentLabel = [departmentCode, departmentName].filter(Boolean).join(' - ')

    return {
      value: id,
      label: [code, projectName, departmentLabel].filter(Boolean).join(' - '),
      meta: {
        budgetAmount,
        budgetRemaining: remaining,
      },
    }
  })
}

function formatDateInputValue(value) {
  if (!value) {
    return ''
  }

  return String(value).slice(0, 10)
}

function formatDuplicateQuantity(value) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? String(numberValue) : '1'
}

function mapDuplicateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [createInitialItem()]
  }

  return items.map((item) => ({
    budget_id: getFirstValue(item, ['budget_id', 'budgetId'], ''),
    memo: getFirstValue(item, ['memo', 'description'], ''),
    quantity: formatDuplicateQuantity(getFirstValue(item, ['quantity'], '1')),
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

function stringifyOptionValues(options) {
  return options.map((option) => ({
    ...option,
    value: String(option.value),
  }))
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

function mapFrpToDuplicateFormValues(frp) {
  return {
    frp_date: getTodayDateValue(),
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
    items: mapDuplicateItems(frp?.items),
    notes: '',
  }
}

function getAuthUser(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function getCreatedFrpId(response) {
  return response?.data?.id ?? response?.data?.data?.id ?? response?.id ?? ''
}

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function getResponseItems(response) {
  const data = getResponseData(response)

  if (Array.isArray(data?.items)) {
    return data.items
  }

  if (Array.isArray(response?.items)) {
    return response.items
  }

  return []
}

function hasHeader(headers, headerName) {
  return Object.keys(headers).some((key) => key.toLowerCase() === headerName.toLowerCase())
}

function getSignedUploadHeaders(uploadItem, file) {
  const headers = {
    ...(uploadItem?.headers || {}),
  }

  if (!hasHeader(headers, 'Content-Type')) {
    headers['Content-Type'] = uploadItem?.mime_type || file?.type || 'application/octet-stream'
  }

  return headers
}

function normalizeDocumentTypeId(documentTypeId) {
  if (documentTypeId === '' || documentTypeId === undefined || documentTypeId === null) {
    return null
  }

  const numericDocumentTypeId = Number(documentTypeId)

  return Number.isFinite(numericDocumentTypeId) ? numericDocumentTypeId : documentTypeId
}

async function uploadCreatedFrpAttachment(frpId, attachment, documentTypeId) {
  const file = attachment?.file
  let uploadItem = null

  if (!file) {
    throw new Error('File attachment tidak tersedia.')
  }

  try {
    const signResponse = await api.frp.attachments.signUpload(frpId, {
      document_type_id: normalizeDocumentTypeId(documentTypeId),
      original_file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
    })
    uploadItem = getResponseItems(signResponse)[0]

    if (!uploadItem?.upload_url) {
      throw new Error('URL upload attachment tidak tersedia.')
    }

    try {
      await api.frp.attachments.uploadToStorage(uploadItem.upload_url, file, {
        method: uploadItem.method || 'PUT',
        headers: getSignedUploadHeaders(uploadItem, file),
      })
    } catch {
      await api.frp.attachments.uploadViaBackend(frpId, uploadItem.attachment_id, file)
    }

    const confirmResponse = await api.frp.attachments.confirm(frpId, {
      attachment_id: uploadItem.attachment_id,
      checksum: null,
    })
    const confirmedAttachment = getResponseItems(confirmResponse)[0]
    const uploadStatus = String(
      confirmedAttachment?.upload_status ?? confirmedAttachment?.status ?? '',
    ).toUpperCase()

    if (uploadStatus && uploadStatus !== 'UPLOADED') {
      throw new Error('Attachment belum berhasil dikonfirmasi.')
    }

    return confirmedAttachment
  } catch (error) {
    if (uploadItem?.attachment_id) {
      try {
        await api.frp.attachments.cancel(frpId, uploadItem.attachment_id)
      } catch {
        // Ignore cleanup errors so the original upload problem stays visible.
      }
    }

    throw error
  }
}

function getPrimaryItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  return items.find((item) => Number(item?.is_primary) === 1) || items[0]
}

function normalizeText(value) {
  return String(value ?? '').trim().toUpperCase()
}

function isActiveRecord(record) {
  const isActive = getFirstValue(record, ['is_active', 'isActive'], 1)

  return Number(isActive) !== 0
}

function getUserDepartmentIds(user = {}) {
  const departments = Array.isArray(user.departments) ? user.departments : []
  const departmentIds = [
    user.context_department_id,
    user.department_id,
    user.departmentId,
    ...departments.map((department) =>
      getFirstValue(department, ['department_id', 'departmentId', 'id']),
    ),
  ]

  return departmentIds.filter(
    (departmentId) => departmentId !== undefined && departmentId !== null && departmentId !== '',
  )
}

function hasCrossBudgetAccess(user = {}, budgetAccessRules = []) {
  const userDepartmentIds = getUserDepartmentIds(user)

  return budgetAccessRules.some((rule) => {
    const ruleDepartmentId = getFirstValue(rule, ['department_id', 'departmentId'])
    const moduleName = normalizeText(getFirstValue(rule, ['module'], FRP_BUDGET_ACCESS_MODULE))
    const accessType = normalizeText(
      getFirstValue(rule, ['access_type', 'accessType'], CROSS_BUDGET_ACCESS_TYPE),
    )

    return (
      isActiveRecord(rule) &&
      moduleName === FRP_BUDGET_ACCESS_MODULE &&
      accessType === CROSS_BUDGET_ACCESS_TYPE &&
      userDepartmentIds.some((departmentId) => String(departmentId) === String(ruleDepartmentId))
    )
  })
}

function filterBudgetsByRequesterScope(budgets, requesterInfo) {
  const requesterDepartmentId = requesterInfo.department_id
  const requesterClassDepartmentId = requesterInfo.class_department_id

  return budgets.filter((budget) => {
    const budgetDepartmentId = getFirstValue(budget, ['department_id', 'departmentId'])
    const budgetClassDepartmentId = getFirstValue(
      budget,
      ['class_department_id', 'classDepartmentId'],
    )

    if (!budgetDepartmentId && !budgetClassDepartmentId) {
      return true
    }

    return (
      (requesterDepartmentId && String(budgetDepartmentId) === String(requesterDepartmentId)) ||
      (requesterClassDepartmentId &&
        String(budgetClassDepartmentId) === String(requesterClassDepartmentId))
    )
  })
}

function getBudgetListParams(requesterInfo, canUseCrossBudget) {
  const params = {
    page: 1,
    limit: 200,
    is_active: 1,
  }

  if (!canUseCrossBudget) {
    params.department_id = requesterInfo.department_id || undefined
    params.class_department_id = requesterInfo.class_department_id || undefined
  }

  return params
}

function getUserRequesterInfo(user = {}) {
  const primaryCompany = getPrimaryItem(user.companies)
  const primaryDepartment = getPrimaryItem(user.departments)
  const companyName = user.company ?? primaryCompany?.name ?? primaryCompany?.company_name
  const departmentId =
    user.context_department_id ??
    user.department_id ??
    primaryDepartment?.department_id ??
    primaryDepartment?.id ??
    ''
  const classDepartmentId =
    user.class_department_id ??
    primaryDepartment?.class_department_id ??
    primaryDepartment?.id ??
    departmentId
  const departmentCode = user.department_code ?? primaryDepartment?.code
  const departmentName =
    user.department ?? primaryDepartment?.name ?? primaryDepartment?.department_name

  return {
    company: companyName ?? '',
    division: [departmentCode, departmentName].filter(Boolean).join(' - '),
    request_by: user.name ?? user.full_name ?? user.username ?? '',
    department_id: departmentId,
    class_department_id: classDepartmentId,
  }
}

function DialogCreateFrp({
  isOpen = false,
  eyebrow = 'Form request payment',
  title = 'Create FRP',
  duplicateFrom = null,
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(createInitialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vendorOptions, setVendorOptions] = useState([])
  const [vendorBankOptions, setVendorBankOptions] = useState([])
  const [externalDocumentTypeOptions, setExternalDocumentTypeOptions] = useState([])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([])
  const [frpDocumentTypeOptions, setFrpDocumentTypeOptions] = useState([])
  const [budgetOptions, setBudgetOptions] = useState([])
  const [requesterInfo, setRequesterInfo] = useState(initialRequesterInfo)
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [attachmentDraft, setAttachmentDraft] = useState(createInitialAttachmentDraft)
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
    setFormValues(createInitialFormValues())
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setVendorOptions([])
    setVendorBankOptions([])
    setExternalDocumentTypeOptions([])
    setPaymentMethodOptions([])
    setFrpDocumentTypeOptions([])
    setBudgetOptions([])
    setRequesterInfo(initialRequesterInfo)
    setIsOptionsLoading(false)
    setOptionsError('')
    setAttachmentDraft(createInitialAttachmentDraft())
  }

  const handleClose = () => {
    resetDialogState()
    onClose?.()
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
      files: [...currentDraft.files, ...selectedFiles.map(createAttachmentFileDraft)],
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

  const duplicateLastItem = () => {
    setFormValues((currentValues) => {
      const lastItem = currentValues.items[currentValues.items.length - 1]

      if (!lastItem) {
        return currentValues
      }

      return {
        ...currentValues,
        items: [...currentValues.items, { ...lastItem }],
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
          authResponse,
          budgetAccessRulesResponse,
          vendorsResponse,
          vendorBanksResponse,
          externalDocumentTypesResponse,
          paymentMethodsResponse,
          frpDocumentTypesResponse,
        ] = await Promise.all([
          api.auth.me({
            signal: controller.signal,
          }),
          api.budgetAccessRules.list(
            {
              page: 1,
              limit: 200,
              module: FRP_BUDGET_ACCESS_MODULE,
              access_type: CROSS_BUDGET_ACCESS_TYPE,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
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
        ])
        const authUser = getAuthUser(authResponse)
        const nextRequesterInfo = getUserRequesterInfo(authUser)
        const canUseCrossBudget = hasCrossBudgetAccess(
          authUser,
          getRowsFromResponse(budgetAccessRulesResponse),
        )
        const budgetsResponse = await api.budgets.list(
          getBudgetListParams(nextRequesterInfo, canUseCrossBudget),
          {
            signal: controller.signal,
          },
        )
        const budgetRows = getRowsFromResponse(budgetsResponse)
        const visibleBudgetRows = canUseCrossBudget
          ? budgetRows
          : filterBudgetsByRequesterScope(budgetRows, nextRequesterInfo)
        const duplicateFormValues = duplicateFrom ? mapFrpToDuplicateFormValues(duplicateFrom) : null

        let nextVendorOptions = mapVendorOptions(getRowsFromResponse(vendorsResponse))
        let nextVendorBankOptions = mapVendorBankOptions(getRowsFromResponse(vendorBanksResponse))
        let nextExternalDocumentTypeOptions = stringifyOptionValues(
          mapCodeNameOptions(getRowsFromResponse(externalDocumentTypesResponse), 'External document'),
        )
        let nextPaymentMethodOptions = mapCodeNameOptions(
          getRowsFromResponse(paymentMethodsResponse),
          'Payment method',
        )
        let nextFrpDocumentTypeOptions = mapNameOptions(
          getRowsFromResponse(frpDocumentTypesResponse),
          'FRP document',
        )
        let nextBudgetOptions = mapBudgetOptions(visibleBudgetRows)

        if (duplicateFormValues) {
          nextVendorOptions = ensureOption(
            nextVendorOptions,
            duplicateFormValues.vendor_id,
            [
              getFirstValue(duplicateFrom, ['vendor_code_snapshot', 'vendor_code'], ''),
              getFirstValue(duplicateFrom, ['vendor_name_snapshot', 'vendor_name'], ''),
            ]
              .filter(Boolean)
              .join(' - '),
          )
          nextVendorBankOptions = ensureOption(
            nextVendorBankOptions,
            duplicateFormValues.vendor_bank_account_id,
            [
              duplicateFormValues.destination_bank_name,
              duplicateFormValues.destination_bank_account,
              duplicateFormValues.destination_bank_account_name,
            ]
              .filter(Boolean)
              .join(' - '),
            {
              vendorId: duplicateFormValues.vendor_id,
              meta: {
                bankName: duplicateFormValues.destination_bank_name,
                accountNumber: duplicateFormValues.destination_bank_account,
                accountName: duplicateFormValues.destination_bank_account_name,
              },
            },
          )
          nextExternalDocumentTypeOptions = ensureOption(
            nextExternalDocumentTypeOptions,
            duplicateFormValues.external_document_type_id,
            [
              getFirstValue(duplicateFrom, ['external_document_type_code_snapshot'], ''),
              getFirstValue(duplicateFrom, ['external_document_type_name_snapshot'], ''),
            ]
              .filter(Boolean)
              .join(' - '),
          )
          nextPaymentMethodOptions = ensureOption(
            nextPaymentMethodOptions,
            duplicateFormValues.payment_method_id,
            [
              getFirstValue(duplicateFrom, ['payment_method_code_snapshot'], ''),
              getFirstValue(duplicateFrom, ['payment_method_name_snapshot'], ''),
            ]
              .filter(Boolean)
              .join(' - '),
          )
          nextFrpDocumentTypeOptions = ensureDocumentTypeOptions(nextFrpDocumentTypeOptions, duplicateFrom)
          nextBudgetOptions = ensureBudgetOptionsForItems(nextBudgetOptions, duplicateFrom?.items)
        }

        setRequesterInfo(nextRequesterInfo)
        setVendorOptions(nextVendorOptions)
        setVendorBankOptions(nextVendorBankOptions)
        setExternalDocumentTypeOptions(nextExternalDocumentTypeOptions)
        setPaymentMethodOptions(nextPaymentMethodOptions)
        setFrpDocumentTypeOptions(nextFrpDocumentTypeOptions)
        setBudgetOptions(nextBudgetOptions)

        if (duplicateFormValues) {
          setFormValues(duplicateFormValues)
          setAttachmentDraft({
            files: [],
            documentTypeId: duplicateFormValues.document_type_ids[0] || '',
          })
        }
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
        setOptionsError(error.message || 'Gagal memuat pilihan FRP.')
      } finally {
        if (!controller.signal.aborted) {
          setIsOptionsLoading(false)
        }
      }
    }

    loadOptions()

    return () => {
      controller.abort()
    }
  }, [isOpen, duplicateFrom])

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

      if (!isPositiveIntegerInput(formValues.items[index]?.quantity)) {
        nextFieldErrors[`items.${index}.quantity`] = 'Quantity harus berupa angka bulat lebih dari 0.'
      }

      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
        nextFieldErrors[`items.${index}.unit_price`] = 'Unit price harus berupa angka valid.'
      }
    })

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
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

      if (attachmentDraft.files.length > 0) {
        const createdFrpId = getCreatedFrpId(response)

        if (!createdFrpId) {
          await onCreated?.(response)
          handleClose()
          return
        }

        try {
          await Promise.all(
            attachmentDraft.files.map((attachment) =>
              uploadCreatedFrpAttachment(createdFrpId, attachment, attachmentDraft.documentTypeId),
            ),
          )
        } catch (error) {
          throw new Error(error.message || 'FRP berhasil dibuat, tetapi attachment gagal diupload.', {
            cause: error,
          })
        }
      }

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
  const exchangeRate = toNumber(formValues.exchange_rate || 1)
  const totalAmountIdr = formValues.items.reduce((total, item) => {
    const quantity = toNumber(item.quantity)
    const unitPrice = toNumber(item.unit_price)

    return total + quantity * unitPrice * exchangeRate
  }, 0)
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
  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation">
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

            <button
              type="button"
              className="frp-bare-icon-button frp-dialog__close-button"
              aria-label="Tutup dialog"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <XClose size={24} />
            </button>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="frp-dialog__panel">
                    <TabsInformation
                      isOptionsLoading={isOptionsLoading}
                      isFormDisabled={isFormDisabled}
                      formValues={formValues}
                      fieldErrors={fieldErrors}
                      externalDocumentTypeOptions={externalDocumentTypeOptions}
                      frpDocumentTypeDropdownOptions={frpDocumentTypeDropdownOptions}
                      attachmentDocumentTypeOptions={attachmentDocumentTypeOptions}
                      attachmentDraft={attachmentDraft}
                      updateValue={updateValue}
                      updateDocumentTypeIds={updateDocumentTypeIds}
                      updateAttachmentDocumentType={updateAttachmentDocumentType}
                      updateAttachmentFile={updateAttachmentFile}
                      removeAttachmentDraft={removeAttachmentDraft}
                      previewAttachmentDraft={previewAttachmentDraft}
                    />

                    <TabsVendor
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

                    <TabsItems
                      formValues={formValues}
                      fieldErrors={fieldErrors}
                      isOptionsLoading={isOptionsLoading}
                      isFormDisabled={isFormDisabled}
                      budgetOptions={budgetOptions}
                      updateValue={updateValue}
                      updateItemValue={updateItemValue}
                      removeItem={removeItem}
                      addItem={addItem}
                      duplicateLastItem={duplicateLastItem}
                    />
                  </div>

                  {optionsError ? <p className="form-control__message">{optionsError}</p> : null}
                  {submitError ? <p className="form-control__message">{submitError}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-popup__actions dashboard-popup__actions--with-total">
            <div className="frp-dialog__total-amount frp-dialog__total-amount--footer" aria-live="polite">
              <span className="frp-dialog__total-amount-icon" aria-hidden="true">
                <TrendingUp size={18} />
              </span>
              <div>
                <span className="frp-dialog__total-amount-label">Total Amount (IDR)</span>
                <strong>{formatRupiah(totalAmountIdr)}</strong>
              </div>
            </div>

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
