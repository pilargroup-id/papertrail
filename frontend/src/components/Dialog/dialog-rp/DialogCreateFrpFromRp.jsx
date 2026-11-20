import { useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import MuiTextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddRoundedIcon from '@mui/icons-material/AddRounded'

import api from '../../../services/api.js'
import { XClose } from '../../layoute/TemplateIcons.jsx'
import SectionHeader from '../dialog-frp/tabs-create-frp/SectionHeader.jsx'
import TabsInformation from '../dialog-frp/tabs-create-frp/TabsInformation.jsx'
import TabsVendor from '../dialog-frp/tabs-create-frp/TabsVendor.jsx'

const getTodayDateValue = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const date = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${date}`
}

const createInitialFormValues = () => ({
  frp_date: getTodayDateValue(),
  description: '',
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

function getAuthUser(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
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
  const companyName = user.company ?? primaryCompany?.name ?? primaryCompany?.company_name
  const departmentCode = user.department_code ?? primaryDepartment?.code
  const departmentName =
    user.department ?? primaryDepartment?.name ?? primaryDepartment?.department_name

  return {
    company: companyName ?? '',
    division: [departmentCode, departmentName].filter(Boolean).join(' - '),
    request_by: user.name ?? user.full_name ?? user.username ?? '',
  }
}

function getRpDetailFromResponse(response) {
  const candidates = [response?.data?.data, response?.data, response]

  return (
    candidates.find(
      (candidate) => candidate && typeof candidate === 'object' && !Array.isArray(candidate),
    ) ?? null
  )
}

function mapRpItemsToFormItems(items = []) {
  return items.map((item) => ({
    rpItemId: item?.id,
    budgetCode: item?.budget_code_snapshot ?? '-',
    projectName: item?.budget_project_name_snapshot ?? '-',
    memo: item?.memo ?? '-',
    quantity: item?.quantity ?? 0,
    unitPrice: item?.unit_price ?? 0,
    rpAmount: item?.amount ?? 0,
    frpAmount: String(item?.amount ?? ''),
  }))
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

function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return `Rp ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue)}`
}

const rpItemTableSx = {
  minWidth: 880,
  tableLayout: 'fixed',
  '& .MuiTableCell-root': {
    px: 1,
    py: 1,
    verticalAlign: 'top',
    borderColor: 'divider',
    fontSize: '0.8125rem',
  },
  '& .MuiTableCell-root:first-of-type': { pl: 1.5 },
  '& .MuiTableCell-root:last-of-type': { pr: 1.5 },
  '& .MuiTableHead-root .MuiTableCell-root': {
    py: 1.25,
    bgcolor: 'rgba(52, 73, 104, 0.04)',
    color: 'text.secondary',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root': {
    borderBottom: 0,
  },
  '& .MuiInputBase-input': { fontSize: '0.8125rem' },
  '& input[type="number"]': { textAlign: 'right' },
  '& .MuiFormHelperText-root': { mx: 0, mt: 0.5, lineHeight: 1.35 },
}

const rpItemTextCellSx = { pt: '14px', overflowWrap: 'anywhere' }

function RpItemsSection({ items, fieldErrors, isFormDisabled, updateItemFrpAmount }) {
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <SectionHeader title="RP Items" />
      <Typography variant="body2" color="text.secondary" sx={{ mt: -1.5, mb: 2 }}>
        Item diambil dari RP. Sesuaikan FRP Amount bila jumlah yang dibayar berbeda dari RP.
      </Typography>

      <Stack spacing={2}>
        <TableContainer
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
          }}
        >
          <Table size="small" sx={rpItemTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 44 }} align="center">
                  #
                </TableCell>
                <TableCell sx={{ minWidth: 240 }}>Budget</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Memo</TableCell>
                <TableCell sx={{ width: 72 }} align="right">
                  Qty
                </TableCell>
                <TableCell sx={{ width: 150 }} align="right">
                  Unit Price
                </TableCell>
                <TableCell sx={{ width: 150 }} align="right">
                  RP Amount
                </TableCell>
                <TableCell sx={{ width: 170 }} align="right">
                  FRP Amount (IDR)
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Tidak ada item RP.
                  </TableCell>
                </TableRow>
              ) : null}

              {items.map((item, index) => {
                const frpAmountError = fieldErrors[`items.${index}.frp_amount`]

                return (
                  <TableRow key={item.rpItemId ?? index}>
                    <TableCell align="center" sx={{ color: 'text.secondary', pt: '14px' }}>
                      {index + 1}
                    </TableCell>
                    <TableCell sx={rpItemTextCellSx}>
                      {[item.budgetCode, item.projectName].filter(Boolean).join(' - ') || '-'}
                    </TableCell>
                    <TableCell sx={rpItemTextCellSx}>{item.memo || '-'}</TableCell>
                    <TableCell align="right" sx={{ pt: '14px' }}>
                      {item.quantity}
                    </TableCell>
                    <TableCell align="right" sx={{ pt: '14px', whiteSpace: 'nowrap' }}>
                      {formatRupiah(item.unitPrice)}
                    </TableCell>
                    <TableCell align="right" sx={{ pt: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatRupiah(item.rpAmount)}
                    </TableCell>
                    <TableCell>
                      <MuiTextField
                        fullWidth
                        size="small"
                        type="number"
                        required
                        placeholder="0"
                        value={item.frpAmount}
                        disabled={isFormDisabled}
                        error={Boolean(frpAmountError)}
                        helperText={frpAmountError}
                        onChange={(event) => updateItemFrpAmount(index, event.target.value)}
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            step: 1,
                            'aria-label': `FRP amount item ${index + 1}`,
                          },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {fieldErrors.items ? (
          <Typography variant="caption" color="error">
            {fieldErrors.items}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

function DialogCreateFrpFromRp({
  isOpen = false,
  eyebrow = 'Convert RP menjadi FRP',
  title = 'Create FRP',
  rp = null,
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(createInitialFormValues)
  const [items, setItems] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vendorOptions, setVendorOptions] = useState([])
  const [vendorBankOptions, setVendorBankOptions] = useState([])
  const [externalDocumentTypeOptions, setExternalDocumentTypeOptions] = useState([])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([])
  const [frpDocumentTypeOptions, setFrpDocumentTypeOptions] = useState([])
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
    setItems([])
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setVendorOptions([])
    setVendorBankOptions([])
    setExternalDocumentTypeOptions([])
    setPaymentMethodOptions([])
    setFrpDocumentTypeOptions([])
    setRequesterInfo(initialRequesterInfo)
    setIsOptionsLoading(false)
    setOptionsError('')
    setAttachmentDraft(createInitialAttachmentDraft())
  }

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

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

  const updateItemFrpAmount = (index, value) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              frpAmount: value,
            }
          : item,
      ),
    )

    setFieldErrors((currentErrors) => {
      const errorKey = `items.${index}.frp_amount`

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
    if (!isOpen || !rp?.id) {
      return undefined
    }

    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const [
          authResponse,
          vendorsResponse,
          vendorBanksResponse,
          externalDocumentTypesResponse,
          paymentMethodsResponse,
          frpDocumentTypesResponse,
          rpDetailResponse,
        ] = await Promise.all([
          api.auth.me({ signal: controller.signal }),
          api.vendors.list({ page: 1, limit: 100, is_active: 1 }, { signal: controller.signal }),
          api.vendorBankAccounts.list(
            { page: 1, limit: 200, is_active: 1 },
            { signal: controller.signal },
          ),
          api.externalDocumentTypes.list(
            { page: 1, limit: 100, is_active: 1 },
            { signal: controller.signal },
          ),
          api.paymentMethods.list(
            { page: 1, limit: 100, is_active: 1 },
            { signal: controller.signal },
          ),
          api.frpDocumentTypes.list(
            { page: 1, limit: 100, is_active: 1 },
            { signal: controller.signal },
          ),
          api.rp.detail(rp.id, { signal: controller.signal }),
        ])
        const authUser = getAuthUser(authResponse)
        const rpDetail = getRpDetailFromResponse(rpDetailResponse)

        setRequesterInfo(getUserRequesterInfo(authUser))
        setVendorOptions(mapVendorOptions(getRowsFromResponse(vendorsResponse)))
        setVendorBankOptions(mapVendorBankOptions(getRowsFromResponse(vendorBanksResponse)))
        setExternalDocumentTypeOptions(
          mapCodeNameOptions(getRowsFromResponse(externalDocumentTypesResponse), 'External document'),
        )
        setPaymentMethodOptions(
          mapCodeNameOptions(getRowsFromResponse(paymentMethodsResponse), 'Payment method'),
        )
        setFrpDocumentTypeOptions(
          mapNameOptions(getRowsFromResponse(frpDocumentTypesResponse), 'FRP document'),
        )
        setItems(mapRpItemsToFormItems(rpDetail?.items))
        setFormValues((currentValues) => ({
          ...currentValues,
          description: rpDetail?.description || '',
          vendor_id: rpDetail?.vendor_id || '',
        }))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setVendorOptions([])
        setVendorBankOptions([])
        setExternalDocumentTypeOptions([])
        setPaymentMethodOptions([])
        setFrpDocumentTypeOptions([])
        setItems([])
        setRequesterInfo(initialRequesterInfo)
        setOptionsError(error.message || 'Gagal memuat data RP.')
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
  }, [isOpen, rp?.id])

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

    if (!formValues.frp_date) {
      nextFieldErrors.frp_date = 'Tanggal FRP wajib diisi.'
    }

    if (!formValues.description.trim()) {
      nextFieldErrors.description = 'Description wajib diisi.'
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

    if (items.length === 0) {
      nextFieldErrors.items = 'RP tidak memiliki item.'
    }

    items.forEach((item, index) => {
      const frpAmount = Number(item.frpAmount)

      if (!Number.isFinite(frpAmount) || frpAmount <= 0) {
        nextFieldErrors[`items.${index}.frp_amount`] = 'FRP amount harus lebih dari 0.'
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
      const response = await api.rp.createFrp(rp.id, {
        frp_date: formValues.frp_date,
        description: formValues.description.trim(),
        vendor_id: formValues.vendor_id,
        vendor_bank_account_id: formValues.vendor_bank_account_id || null,
        internal_po_number: formValues.internal_po_number.trim(),
        external_document_type_id: formValues.external_document_type_id || null,
        external_document_number: formValues.external_document_number.trim(),
        payment_method_id: formValues.payment_method_id,
        payment_date: formValues.payment_date,
        destination_bank_name: formValues.destination_bank_name.trim(),
        destination_bank_account: formValues.destination_bank_account.trim(),
        destination_bank_account_name: formValues.destination_bank_account_name.trim(),
        document_type_ids: formValues.document_type_ids.map((id) => Number(id)),
        notes: formValues.notes.trim() || `Create FRP from RP ${rp?.rp_number ?? rp?.id ?? ''}`,
        items: items.map((item) => ({
          rp_request_item_id: item.rpItemId,
          frp_amount: Number(item.frpAmount),
        })),
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

      setSubmitError(error.message || 'Gagal membuat FRP dari RP.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
  const rpLabel = rp?.rp_number ?? rp?.id ?? 'RP'

  const totalFrpAmount = items.reduce((total, item) => total + (Number(item.frpAmount) || 0), 0)

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 640, md: 960, lg: 1180 },
            maxWidth: '100%',
          },
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 3,
            py: 2,
            bgcolor: '#344968',
            color: '#fff',
            borderBottom: '1px solid rgba(255, 255, 255, 0.16)',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                lineHeight: 1.6,
                letterSpacing: 0.5,
                color: 'rgba(255, 255, 255, 0.72)',
              }}
            >
              {eyebrow}
            </Typography>
            <Typography
              variant="h6"
              id="dialog-create-frp-from-rp-title"
              sx={{ fontWeight: 700, lineHeight: 1.3, color: '#fff' }}
            >
              {title} dari {rpLabel}
            </Typography>
          </Box>

          <IconButton
            aria-label="Tutup dialog"
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: '5px',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
              '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.4)' },
            }}
          >
            <XClose size={20} />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
          <TabsInformation
            requesterInfo={requesterInfo}
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

          <RpItemsSection
            items={items}
            fieldErrors={fieldErrors}
            isFormDisabled={isFormDisabled}
            updateItemFrpAmount={updateItemFrpAmount}
          />

          <Box component="section" sx={{ mb: 2 }}>
            <MuiTextField
              fullWidth
              label="Notes"
              multiline
              minRows={4}
              placeholder={`Create FRP from RP ${rpLabel}`}
              value={formValues.notes}
              disabled={isFormDisabled}
              error={Boolean(fieldErrors.notes)}
              helperText={fieldErrors.notes}
              onChange={(event) => updateValue('notes', event.target.value)}
            />
          </Box>

          {optionsError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {optionsError}
            </Alert>
          ) : null}
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
        </Box>

        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total FRP Amount (IDR)
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {formatRupiah(totalFrpAmount)}
            </Typography>
          </Box>

          <Button
            type="submit"
            variant="contained"
            startIcon={<AddRoundedIcon />}
            disabled={isFormDisabled}
            sx={{
              height: 44,
              minWidth: 118,
              px: 2.25,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              bgcolor: 'var(--accent-teal, #2a9d8f)',
              boxShadow: '0 10px 22px rgba(42, 157, 143, 0.26)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
              '&:hover': {
                bgcolor: 'var(--accent-teal-dark, #21867a)',
                boxShadow: '0 14px 28px rgba(42, 157, 143, 0.32)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:focus-visible': {
                boxShadow:
                  '0 0 0 4px rgba(42, 157, 143, 0.18), 0 14px 28px rgba(42, 157, 143, 0.32)',
              },
              '&.Mui-disabled': {
                boxShadow: 'none',
              },
            }}
          >
            {isSubmitting ? 'Creating...' : isOptionsLoading ? 'Loading...' : 'Create FRP'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}

export default DialogCreateFrpFromRp
