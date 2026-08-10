import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { TrendingUp, XClose } from '../../layoute/TemplateIcons.jsx'
import TabsInformation from './tabs-edit-frp/TabsInformation.jsx'
import TabsItems from './tabs-edit-frp/TabsItems.jsx'
import TabsVendor from './tabs-edit-frp/TabsVendor.jsx'

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

function stringifyOptionValues(options) {
  return options.map((option) => ({
    ...option,
    value: String(option.value),
  }))
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

function filterBudgetsByRequesterScope(budgets, scopeInfo) {
  const scopeDepartmentId = scopeInfo.department_id
  const scopeClassDepartmentId = scopeInfo.class_department_id

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
      (scopeDepartmentId && String(budgetDepartmentId) === String(scopeDepartmentId)) ||
      (scopeClassDepartmentId && String(budgetClassDepartmentId) === String(scopeClassDepartmentId))
    )
  })
}

function getBudgetListParams(scopeInfo, canUseCrossBudget) {
  const params = {
    page: 1,
    limit: 200,
    is_active: 1,
  }

  if (!canUseCrossBudget) {
    params.department_id = scopeInfo.department_id || undefined
    params.class_department_id = scopeInfo.class_department_id || undefined
  }

  return params
}

function getUserRequesterInfo(user = {}) {
  const primaryCompany = getPrimaryItem(user.companies)
  const primaryDepartment = getPrimaryItem(user.departments)
  const companyCode = user.company_code ?? primaryCompany?.code
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
    company: [companyCode, companyName].filter(Boolean).join(' - '),
    division: [departmentCode, departmentName].filter(Boolean).join(' - '),
    request_by: user.name ?? user.full_name ?? user.username ?? '',
    department_id: departmentId,
    class_department_id: classDepartmentId,
  }
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

async function uploadEditFrpAttachment(frpId, attachment, documentTypeId) {
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

function DialogEditFrp({
  isOpen = false,
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
  const [vendorOptions, setVendorOptions] = useState([])
  const [vendorBankOptions, setVendorBankOptions] = useState([])
  const [externalDocumentTypeOptions, setExternalDocumentTypeOptions] = useState([])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([])
  const [frpDocumentTypeOptions, setFrpDocumentTypeOptions] = useState([])
  const [budgetOptions, setBudgetOptions] = useState([])
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
    setVendorOptions([])
    setVendorBankOptions([])
    setExternalDocumentTypeOptions([])
    setPaymentMethodOptions([])
    setFrpDocumentTypeOptions([])
    setBudgetOptions([])
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
    const uploadStatus = getAttachmentUploadStatus(attachment)

    if (uploadStatus && uploadStatus !== 'UPLOADED') {
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

    const frpId = frp?.id
    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const [
          frpDetailResponse,
          authResponse,
          budgetAccessRulesResponse,
          vendorsResponse,
          vendorBanksResponse,
          externalDocumentTypesResponse,
          paymentMethodsResponse,
          frpDocumentTypesResponse,
        ] = await Promise.all([
          frpId === undefined || frpId === null
            ? Promise.resolve(frp)
            : api.frp.detail(frpId, undefined, {
                signal: controller.signal,
              }),
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
        const frpDetail = getFrpDetailFromResponse(frpDetailResponse) ?? frp ?? {}
        const authUser = getAuthUser(authResponse)
        const nextFormValues = mapFrpToFormValues(frpDetail)
        const scopeInfo = getUserRequesterInfo(authUser)
        const canUseCrossBudget = hasCrossBudgetAccess(
          authUser,
          getRowsFromResponse(budgetAccessRulesResponse),
        )
        const budgetsResponse = await api.budgets.list(
          getBudgetListParams(scopeInfo, canUseCrossBudget),
          {
            signal: controller.signal,
          },
        )
        const budgetRows = getRowsFromResponse(budgetsResponse)
        const visibleBudgetRows = canUseCrossBudget
          ? budgetRows
          : filterBudgetsByRequesterScope(budgetRows, scopeInfo)
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
          mapBudgetOptions(visibleBudgetRows),
          frpDetail?.items,
        )
        const nextExistingAttachments = getFrpAttachments(frpDetail).filter(isActiveAttachment)

        setFormValues(nextFormValues)
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

    loadOptions()

    return () => {
      controller.abort()
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
              uploadEditFrpAttachment(updatedFrpId, attachment, attachmentDraft.documentTypeId),
            ),
          )
        } catch (error) {
          throw new Error(error.message || 'FRP berhasil diperbarui, tetapi attachment gagal diupload.', {
            cause: error,
          })
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
        aria-labelledby="dialog-edit-frp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-edit-frp-title">
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
                      existingAttachments={existingAttachments}
                      attachmentActionError={attachmentActionError}
                      updateValue={updateValue}
                      updateDocumentTypeIds={updateDocumentTypeIds}
                      updateAttachmentDocumentType={updateAttachmentDocumentType}
                      updateAttachmentFile={updateAttachmentFile}
                      removeAttachmentDraft={removeAttachmentDraft}
                      previewAttachmentDraft={previewAttachmentDraft}
                      previewExistingAttachment={previewExistingAttachment}
                      removeExistingAttachment={removeExistingAttachment}
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
              {isSubmitting ? 'Updating...' : isOptionsLoading ? 'Loading...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditFrp
