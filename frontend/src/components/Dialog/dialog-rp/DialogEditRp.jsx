import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import api from '../../../services/api.js'
import { XClose } from '../../layoute/TemplateIcons.jsx'
import TabsItemsCreate from './tabs-create-rp/TabsItemsCreate.jsx'
import TabsVendorCreate from './tabs-create-rp/TabsVendorCreate.jsx'

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
  purchase_link: '',
  quantity: '1',
  unit_price: '',
})

const editInitialFormValues = () => ({
  department_id: '',
  class_department_id: '',
  date_required: getTodayDateValue(),
  description: '',
  vendor_id: '',
  payment_category_id: '',
  destination_department_id: '',
  pic_name: '',
  items: [editInitialItem()],
  notes: 'Update RP',
})

const initialRequesterInfo = {
  company: '',
  division: '',
  request_by: '',
  department_id: '',
  class_department_id: '',
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
    }
  })
}

function mapPaymentCategoryOptions(categories) {
  return categories.map((category) => {
    const id = getFirstValue(category, ['id', 'payment_category_id'])
    const name = getFirstValue(category, ['name'], `Category #${id ?? '-'}`)

    return {
      value: id,
      label: name,
    }
  })
}

function mapDestinationDepartmentOptions(departments) {
  return departments.map((department) => {
    const id = getFirstValue(department, ['department_id', 'id'])
    const code = getFirstValue(department, ['department_code_snapshot', 'code'])
    const name = getFirstValue(
      department,
      ['department_name_snapshot', 'name'],
      `Department #${id ?? '-'}`,
    )
    const className = getFirstValue(department, ['department_class_snapshot', 'class'])

    return {
      value: id,
      label: [code, name, className].filter(Boolean).join(' - '),
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
    const departmentCode = getFirstValue(budget, ['department_code_snapshot', 'department_code'])
    const departmentName = getFirstValue(budget, ['department_name_snapshot', 'department_name'])
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

function getUserDisplayName(user) {
  const name = getFirstValue(user, ['full_name', 'fullName', 'name', 'display_name', 'employee_name'])

  return typeof name === 'string' ? name.trim() : ''
}

function userBelongsToDepartment(user, departmentId) {
  const targetId = Number(departmentId)

  if (!targetId) {
    return false
  }

  const departments = Array.isArray(user?.departments) ? user.departments : []

  return departments.some((department) => {
    const departmentIds = [department?.id, department?.department_id, department?.class_department_id]

    return departmentIds.some((id) => Number(id) === targetId)
  })
}

function mapPicOptions(users, departmentId) {
  const seenNames = new Set()

  return users
    .filter((user) => userBelongsToDepartment(user, departmentId))
    .reduce((options, user) => {
      const name = getUserDisplayName(user)

      if (!name || seenNames.has(name)) {
        return options
      }

      seenNames.add(name)
      options.push({ value: name, label: name })

      return options
    }, [])
    .sort((a, b) => a.label.localeCompare(b.label))
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

function hasOptionValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return true
  }

  return options.some((option) => String(option.value) === String(value))
}

function ensureOption(options, value, label) {
  if (hasOptionValue(options, value)) {
    return options
  }

  return [
    {
      value,
      label: label || `Selected #${value}`,
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

function getRpFromResponse(response) {
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

function formatIntegerInputValue(value, fallback = '1') {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const numberValue = Number(value)

  if (Number.isSafeInteger(numberValue)) {
    return String(numberValue)
  }

  return String(value)
}

function getRpItems(rp) {
  const candidates = [
    rp?.items,
    rp?.rp_items,
    rp?.rpItems,
    rp?.request_items,
    rp?.requestItems,
  ]

  return candidates.find((items) => Array.isArray(items)) ?? []
}

function mapRpItemsToFormItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [editInitialItem()]
  }

  return items.map((item) => ({
    budget_id: getFirstValue(item, ['budget_id', 'budgetId'], ''),
    memo: getFirstValue(item, ['memo', 'description'], ''),
    purchase_link: getFirstValue(item, ['purchase_link', 'purchaseLink'], ''),
    quantity: formatIntegerInputValue(getFirstValue(item, ['quantity', 'qty'], '1')),
    unit_price: String(getFirstValue(item, ['unit_price', 'unitPrice'], '')),
  }))
}

function mapRpToFormValues(rp) {
  return {
    department_id: getFirstValue(rp, ['department_id', 'departmentId'], ''),
    class_department_id: getFirstValue(rp, ['class_department_id', 'classDepartmentId'], ''),
    date_required: formatDateInputValue(
      getFirstValue(rp, ['date_required', 'dateRequired', 'created_at'], getTodayDateValue()),
    ),
    description: getFirstValue(rp, ['description'], ''),
    vendor_id: getFirstValue(rp, ['vendor_id', 'vendorId'], ''),
    payment_category_id: getFirstValue(
      rp,
      ['payment_category_id', 'paymentCategoryId', 'rp_payment_category_id'],
      '',
    ),
    destination_department_id: getFirstValue(
      rp,
      ['destination_department_id', 'destinationDepartmentId'],
      '',
    ),
    pic_name: getFirstValue(rp, ['pic_name', 'picName'], ''),
    items: mapRpItemsToFormItems(getRpItems(rp)),
    notes: getFirstValue(rp, ['notes'], 'Update RP'),
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
  const departmentCode =
    user.context_department_code ?? user.department_code ?? primaryDepartment?.code
  const departmentName =
    user.context_department_name ??
    user.department ??
    primaryDepartment?.name ??
    primaryDepartment?.department_name

  return {
    company: [companyCode, companyName].filter(Boolean).join(' - '),
    division: [departmentCode, departmentName].filter(Boolean).join(' - '),
    request_by: user.name ?? user.full_name ?? user.username ?? '',
    department_id: departmentId,
    class_department_id: classDepartmentId,
  }
}

function getRpRequesterInfo(rp = {}, fallbackUser = {}) {
  const fallbackRequesterInfo = getUserRequesterInfo(fallbackUser)
  const companyCode = getFirstValue(rp, ['company_code_snapshot', 'company_code'], '')
  const companyName = getFirstValue(rp, ['company_name_snapshot', 'company_name'], '')
  const departmentCode = getFirstValue(rp, ['department_code_snapshot', 'department_code'], '')
  const departmentName = getFirstValue(rp, ['department_name_snapshot', 'department_name'], '')
  const requestedBy = getFirstValue(
    rp,
    ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name'],
    '',
  )

  return {
    company: [companyCode, companyName].filter(Boolean).join(' - ') || fallbackRequesterInfo.company,
    division:
      [departmentCode, departmentName].filter(Boolean).join(' - ') ||
      fallbackRequesterInfo.division,
    request_by: requestedBy || fallbackRequesterInfo.request_by,
    department_id: getFirstValue(rp, ['department_id'], fallbackRequesterInfo.department_id),
    class_department_id: getFirstValue(
      rp,
      ['class_department_id'],
      fallbackRequesterInfo.class_department_id,
    ),
  }
}

function isPositiveIntegerInput(value) {
  const normalizedValue = String(value ?? '').trim()
  const numberValue = Number(normalizedValue)

  return /^\d+$/.test(normalizedValue) && Number.isSafeInteger(numberValue) && numberValue > 0
}

function DialogEditRp({
  isOpen = false,
  eyebrow = 'Form request purchase',
  title = 'Edit RP',
  rp = null,
  onClose,
  onUpdated,
}) {
  const [formValues, setFormValues] = useState(editInitialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vendorOptions, setVendorOptions] = useState([])
  const [paymentCategoryOptions, setPaymentCategoryOptions] = useState([])
  const [destinationDepartmentOptions, setDestinationDepartmentOptions] = useState([])
  const [budgetOptions, setBudgetOptions] = useState([])
  const [userDirectory, setUserDirectory] = useState([])
  const [initialPicName, setInitialPicName] = useState({ departmentId: '', name: '' })
  const [, setRequesterInfo] = useState(initialRequesterInfo)
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const picOptions = useMemo(() => {
    const options = mapPicOptions(userDirectory, formValues.destination_department_id)
    const savedPicName = initialPicName.name

    // Keep the PIC saved on this RP selectable even if the user directory no
    // longer lists them under the destination division.
    if (
      savedPicName &&
      String(initialPicName.departmentId) === String(formValues.destination_department_id) &&
      !options.some((option) => option.value === savedPicName)
    ) {
      return [{ value: savedPicName, label: savedPicName }, ...options]
    }

    return options
  }, [userDirectory, formValues.destination_department_id, initialPicName])

  const searchVendorOptions = useCallback(async (query, { signal } = {}) => {
    const response = await api.vendors.list(
      {
        q: query,
        is_active: 1,
        limit: 20,
      },
      { signal },
    )

    return mapVendorOptions(getRowsFromResponse(response))
  }, [])

  const createVendorOption = useCallback(async (name) => {
    const response = await api.vendors.create({ name })
    const vendor = response?.data ?? response
    const [option] = mapVendorOptions([vendor])

    setVendorOptions((currentOptions) => {
      if (currentOptions.some((existing) => existing.value === option.value)) {
        return currentOptions
      }

      return [...currentOptions, option].sort((a, b) => a.label.localeCompare(b.label))
    })

    return option
  }, [])

  const resetDialogState = useCallback(() => {
    setFormValues(editInitialFormValues())
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setVendorOptions([])
    setPaymentCategoryOptions([])
    setDestinationDepartmentOptions([])
    setBudgetOptions([])
    setUserDirectory([])
    setInitialPicName({ departmentId: '', name: '' })
    setRequesterInfo(initialRequesterInfo)
    setIsOptionsLoading(false)
    setOptionsError('')
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  const updateValue = (fieldName, value) => {
    setFormValues((currentValues) => {
      if (
        fieldName === 'destination_department_id' &&
        String(currentValues.destination_department_id) !== String(value)
      ) {
        return {
          ...currentValues,
          destination_department_id: value,
          pic_name: '',
        }
      }

      return {
        ...currentValues,
        [fieldName]: value,
      }
    })

    setFieldErrors((currentErrors) => {
      const fieldsToClear =
        fieldName === 'destination_department_id' ? [fieldName, 'pic_name'] : [fieldName]

      if (!fieldsToClear.some((field) => currentErrors[field])) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }

      fieldsToClear.forEach((field) => {
        nextErrors[field] = ''
      })

      return nextErrors
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

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')
      setFieldErrors({})
      setSubmitError('')

      try {
        const rpId = rp?.id
        const [
          rpDetailResponse,
          authResponse,
          vendorsResponse,
          paymentCategoriesResponse,
          destinationDepartmentsResponse,
          budgetsResponse,
          usersResponse,
        ] = await Promise.all([
          rpId === undefined || rpId === null || rpId === ''
            ? Promise.resolve(rp)
            : api.rp.detail(rpId, undefined, {
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
          api.rpPaymentCategories.list(
            {
              page: 1,
              limit: 100,
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
          api.rpDestinationDepartments.list(
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
          api.directory.users.list(undefined, {
            signal: controller.signal,
          }),
        ])
        const rpDetail = getRpFromResponse(rpDetailResponse) ?? rp ?? {}
        const authUser = getAuthUser(authResponse)
        const nextFormValues = mapRpToFormValues(rpDetail)
        const nextRequesterInfo = getRpRequesterInfo(rpDetail, authUser)
        const nextVendorOptions = ensureOption(
          mapVendorOptions(getRowsFromResponse(vendorsResponse)),
          nextFormValues.vendor_id,
          [
            getFirstValue(rpDetail, ['vendor_code_snapshot', 'vendor_code'], ''),
            getFirstValue(rpDetail, ['vendor_name_snapshot', 'vendor_name'], ''),
          ]
            .filter(Boolean)
            .join(' - '),
        )
        const nextPaymentCategoryOptions = ensureOption(
          mapPaymentCategoryOptions(getRowsFromResponse(paymentCategoriesResponse)),
          nextFormValues.payment_category_id,
          [
            getFirstValue(rpDetail, ['payment_category_name_snapshot'], ''),
          ]
            .filter(Boolean)
            .join(' - '),
        )
        const nextDestinationDepartmentOptions = ensureOption(
          mapDestinationDepartmentOptions(getRowsFromResponse(destinationDepartmentsResponse)),
          nextFormValues.destination_department_id,
          [
            getFirstValue(rpDetail, ['destination_department_code_snapshot'], ''),
            getFirstValue(rpDetail, ['destination_department_name_snapshot'], ''),
            getFirstValue(rpDetail, ['destination_department_class_snapshot'], ''),
          ]
            .filter(Boolean)
            .join(' - '),
        )
        const nextBudgetOptions = ensureBudgetOptionsForItems(
          mapBudgetOptions(getRowsFromResponse(budgetsResponse)),
          getRpItems(rpDetail),
        )

        const nextPicName = nextFormValues.pic_name || nextRequesterInfo.request_by || ''

        setRequesterInfo(nextRequesterInfo)
        setFormValues({
          ...nextFormValues,
          department_id: nextFormValues.department_id || nextRequesterInfo.department_id || '',
          class_department_id:
            nextFormValues.class_department_id || nextRequesterInfo.class_department_id || '',
          pic_name: nextPicName,
        })
        setInitialPicName({
          departmentId: nextFormValues.destination_department_id,
          name: nextPicName,
        })
        setVendorOptions(nextVendorOptions)
        setPaymentCategoryOptions(nextPaymentCategoryOptions)
        setDestinationDepartmentOptions(nextDestinationDepartmentOptions)
        setBudgetOptions(nextBudgetOptions)
        setUserDirectory(getRowsFromResponse(usersResponse))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setVendorOptions([])
        setPaymentCategoryOptions([])
        setDestinationDepartmentOptions([])
        setBudgetOptions([])
        setUserDirectory([])
        setRequesterInfo(initialRequesterInfo)
        setOptionsError(error.message || 'Gagal memuat pilihan RP.')
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
  }, [isOpen, rp])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextFieldErrors = {}
    const normalizedItems = formValues.items.map((item) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unit_price)

      return {
        budget_id: item.budget_id,
        memo: item.memo.trim(),
        purchase_link: item.purchase_link.trim(),
        quantity,
        unit_price: unitPrice,
        amount: quantity * unitPrice,
      }
    })

    if (!formValues.date_required) {
      nextFieldErrors.date_required = 'RP Date wajib diisi.'
    }

    if (!formValues.description.trim()) {
      nextFieldErrors.description = 'Description wajib diisi.'
    }

    if (!formValues.vendor_id) {
      nextFieldErrors.vendor_id = 'Vendor wajib dipilih.'
    }

    if (!formValues.payment_category_id) {
      nextFieldErrors.payment_category_id = 'Category payment wajib dipilih.'
    }

    if (!formValues.destination_department_id) {
      nextFieldErrors.destination_department_id = 'Division to process wajib dipilih.'
    }

    if (!formValues.pic_name.trim()) {
      nextFieldErrors.pic_name = 'PIC wajib diisi.'
    }

    normalizedItems.forEach((item, index) => {
      if (!item.budget_id) {
        nextFieldErrors[`items.${index}.budget_id`] = 'Budget wajib dipilih.'
      }

      if (!item.memo) {
        nextFieldErrors[`items.${index}.memo`] = 'Memo wajib diisi.'
      }

      if (!isPositiveIntegerInput(formValues.items[index]?.quantity)) {
        nextFieldErrors[`items.${index}.quantity`] = 'Qty harus berupa angka bulat lebih dari 0.'
      }

      if (!Number.isFinite(item.unit_price) || item.unit_price <= 0) {
        nextFieldErrors[`items.${index}.unit_price`] = 'Nominal item harus lebih dari 0.'
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
      const rpId = rp?.id

      if (rpId === undefined || rpId === null || rpId === '') {
        throw new Error('ID RP tidak tersedia.')
      }

      const response = await api.rp.update(rpId, {
        department_id: formValues.department_id || undefined,
        class_department_id: formValues.class_department_id || undefined,
        destination_department_id: formValues.destination_department_id,
        date_required: formValues.date_required,
        vendor_source: 'MASTER',
        vendor_id: formValues.vendor_id,
        payment_category_id: formValues.payment_category_id,
        pic_name: formValues.pic_name.trim(),
        description: formValues.description.trim(),
        items: normalizedItems,
        notes: formValues.notes.trim() || 'Update RP',
      })

      await onUpdated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors(error.data.errors)
      }

      setSubmitError(error.message || 'Gagal memperbarui RP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormDisabled = isSubmitting || isOptionsLoading
  const totalAmount = formValues.items.reduce((total, item) => {
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unit_price)

    return (
      total +
      (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0)
    )
  }, 0)

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={isSubmitting ? undefined : handleClose}
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
              id="dialog-edit-rp-title"
              sx={{ fontWeight: 700, lineHeight: 1.3, color: '#fff' }}
            >
              {title}
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
          <TabsVendorCreate
            formValues={formValues}
            fieldErrors={fieldErrors}
            isOptionsLoading={isOptionsLoading}
            isFormDisabled={isFormDisabled}
            vendorOptions={vendorOptions}
            onSearchVendors={searchVendorOptions}
            onCreateVendor={createVendorOption}
            paymentCategoryOptions={paymentCategoryOptions}
            destinationDepartmentOptions={destinationDepartmentOptions}
            picOptions={picOptions}
            updateValue={updateValue}
          />

          <TabsItemsCreate
            formValues={formValues}
            fieldErrors={fieldErrors}
            isOptionsLoading={isOptionsLoading}
            isFormDisabled={isFormDisabled}
            budgetOptions={budgetOptions}
            updateItemValue={updateItemValue}
            removeItem={removeItem}
            addItem={addItem}
            duplicateLastItem={duplicateLastItem}
          />

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
              Total RP (IDR)
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {formatRupiah(totalAmount)}
            </Typography>
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={isFormDisabled}
            sx={{
              height: 44,
              minWidth: 140,
              px: 2.25,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
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
            {isSubmitting ? 'Updating...' : isOptionsLoading ? 'Loading...' : 'Update'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}

export default DialogEditRp
