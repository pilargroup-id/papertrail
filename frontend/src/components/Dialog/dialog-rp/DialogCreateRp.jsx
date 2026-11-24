import { useCallback, useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import api from '../../../services/api.js'
import {
  FORM_DRAFT_KEYS,
  clearFormDraft,
  loadFormDraft,
  saveFormDraft,
} from '../../../services/formDraftStorage.js'
import { XClose } from '../../layoute/TemplateIcons.jsx'
import DialogConfirmDraft from '../DialogConfirmDraft.jsx'
import DraftRestoredBanner from '../DraftRestoredBanner.jsx'
import TabsItemsCreate from './tabs-create-rp/TabsItemsCreate.jsx'
import TabsVendorCreate from './tabs-create-rp/TabsVendorCreate.jsx'

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
  purchase_link: '',
  quantity: '1',
  unit_price: '',
})

const createInitialFormValues = () => ({
  department_id: '',
  class_department_id: '',
  for_department_id: '',
  for_class_department_id: '',
  date_required: getTodayDateValue(),
  description: '',
  vendor_name: '',
  payment_category_id: '',
  destination_department_id: '',
  pic_name: '',
  items: [createInitialItem()],
  notes: 'Submit RP',
})

function serializeFormValues(values) {
  return JSON.stringify(values)
}

function normalizeDraftFormValues(values) {
  const initialValues = createInitialFormValues()
  const draftItems = Array.isArray(values?.items) && values.items.length > 0 ? values.items : null

  return {
    ...initialValues,
    ...values,
    items: draftItems
      ? draftItems.map((item) => ({ ...createInitialItem(), ...item }))
      : initialValues.items,
  }
}

function withRequesterDepartment(values, requesterInfo) {
  const forDepartmentId = values.for_department_id || requesterInfo.department_id || ''

  return {
    ...values,
    department_id: values.department_id || requesterInfo.department_id || '',
    class_department_id: values.class_department_id || requesterInfo.class_department_id || '',
    // Default "Untuk Divisi" = divisi pembuat; user dapat menggantinya.
    for_department_id: forDepartmentId,
    for_class_department_id:
      values.for_class_department_id ||
      (values.for_department_id ? values.for_department_id : requesterInfo.class_department_id) ||
      forDepartmentId,
  }
}

// Opsi "Untuk Divisi" dan "Class" dari direktori department PilarGroup
// (pola yang sama dengan DialogCreateBudgets).
function mapForDepartmentOptions(departments) {
  return departments.map((department) => {
    const id = getFirstValue(department, ['id', 'department_id', 'uuid'])
    const code = getFirstValue(department, ['code', 'department_code'])
    const name = getFirstValue(department, ['name', 'department_name', 'label'], `Department #${id ?? '-'}`)

    return {
      value: id,
      label: [code, name].filter(Boolean).join(' - '),
    }
  })
}

function mapForClassOptions(departments) {
  const uniqueOptions = new Map()

  departments.forEach((department) => {
    const id = getFirstValue(department, ['id', 'department_id', 'uuid'])
    const code = getFirstValue(department, ['code', 'department_code'])
    const className = getFirstValue(
      department,
      ['class', 'department_class', 'class_name', 'name', 'department_name'],
      `Class #${id ?? '-'}`,
    )
    const optionKey = String(id)

    if (!uniqueOptions.has(optionKey)) {
      uniqueOptions.set(optionKey, {
        value: id,
        label: [code, className].filter(Boolean).join(' - '),
      })
    }
  })

  return Array.from(uniqueOptions.values())
}

const initialRequesterInfo = {
  company_id: '',
  company: '',
  division: '',
  request_by: '',
  department_id: '',
  class_department_id: '',
  // Aturan CROSS_BUDGET aktif (modul RP); dicocokkan dengan "Untuk Divisi" yang dipilih.
  cross_budget_rules: [],
}

const RP_BUDGET_PURPOSE = 'RP'
const CROSS_BUDGET_ACCESS_TYPE = 'CROSS_BUDGET'

// Aturan CROSS_BUDGET aktif untuk modul RP pada departemen terpilih (master Budget Access)
// membolehkan pemakaian anggaran departemen lain dalam perusahaan yang sama.
function hasCrossBudgetAccess(departmentId, budgetAccessRules = []) {
  if (!departmentId) {
    return false
  }

  return budgetAccessRules.some((rule) => {
    const ruleModule = String(getFirstValue(rule, ['module'], RP_BUDGET_PURPOSE)).toUpperCase()
    const ruleAccessType = String(
      getFirstValue(rule, ['access_type', 'accessType'], CROSS_BUDGET_ACCESS_TYPE),
    ).toUpperCase()
    const isActive = Number(getFirstValue(rule, ['is_active', 'isActive'], 1)) !== 0

    return (
      isActive &&
      ruleModule === RP_BUDGET_PURPOSE &&
      ruleAccessType === CROSS_BUDGET_ACCESS_TYPE &&
      String(getFirstValue(rule, ['department_id', 'departmentId'])) === String(departmentId)
    )
  })
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
    const label = [code, name, className].filter(Boolean).join(' - ')

    return {
      value: id,
      label,
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

// Budget RP mengikuti "Untuk Divisi" (department + class), apa pun divisi pembuatnya.
// Jika "Untuk Divisi" memiliki aturan CROSS_BUDGET, semua anggaran aktif pada perusahaan
// terpilih terbuka.
function getBudgetListParams(requesterInfo, forDepartmentId, forClassDepartmentId) {
  if (!requesterInfo?.department_id || !forDepartmentId) {
    return null
  }

  if (hasCrossBudgetAccess(forDepartmentId, requesterInfo.cross_budget_rules)) {
    return {
      page: 1,
      limit: 200,
      is_active: 1,
      purpose: RP_BUDGET_PURPOSE,
      company_id: requesterInfo.company_id || undefined,
    }
  }

  return {
    page: 1,
    limit: 200,
    is_active: 1,
    purpose: RP_BUDGET_PURPOSE,
    company_id: requesterInfo.company_id || undefined,
    department_id: forDepartmentId,
    class_department_id: forClassDepartmentId || forDepartmentId,
  }
}

function getBudgetScopeKey(requesterInfo, formValues) {
  const params = getBudgetListParams(
    requesterInfo,
    formValues?.for_department_id,
    formValues?.for_class_department_id,
  )

  return params ? JSON.stringify(params) : ''
}

function isSameIdOrUnknown(expectedId, actualId) {
  if (expectedId === undefined || expectedId === null || expectedId === '') {
    return true
  }

  if (actualId === undefined || actualId === null || actualId === '') {
    return true
  }

  return String(expectedId) === String(actualId)
}

// Filter defensif yang mengikuti aturan budget RP di backend:
// - Default: budget harus sama dengan company serta department + class pada "Untuk Divisi".
// - Departemen CROSS_BUDGET: params tanpa department, jadi hanya company yang dicocokkan.
function filterBudgetsByRpContext(budgets, params) {
  return budgets.filter((budget) => {
    const budgetCompanyId = getFirstValue(budget, ['company_id', 'companyId'])
    const budgetDepartmentId = getFirstValue(budget, ['department_id', 'departmentId'])
    const budgetClassDepartmentId = getFirstValue(budget, [
      'class_department_id',
      'classDepartmentId',
    ])

    if (!isSameIdOrUnknown(params.company_id, budgetCompanyId)) {
      return false
    }

    return (
      isSameIdOrUnknown(params.department_id, budgetDepartmentId) &&
      isSameIdOrUnknown(params.class_department_id, budgetClassDepartmentId)
    )
  })
}

async function fetchRpBudgetOptions(budgetScopeKey, signal) {
  if (!budgetScopeKey) {
    return []
  }

  const params = JSON.parse(budgetScopeKey)
  const response = await api.budgets.list(params, { signal })

  return mapBudgetOptions(filterBudgetsByRpContext(getRowsFromResponse(response), params))
}

function createEmptyBudgetState() {
  return { key: '', options: [], error: '' }
}

function keepValidBudgetSelections(values, budgetOptions) {
  return {
    ...values,
    items: values.items.map((item) =>
      hasOptionValue(budgetOptions, item.budget_id) ? item : { ...item, budget_id: '' },
    ),
  }
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
    company_id: user.company_id ?? primaryCompany?.id ?? primaryCompany?.company_id ?? '',
    company: [companyCode, companyName].filter(Boolean).join(' - '),
    division: [departmentCode, departmentName].filter(Boolean).join(' - '),
    request_by: user.name ?? user.full_name ?? user.username ?? '',
    department_id: departmentId,
    class_department_id: classDepartmentId,
  }
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

function isPositiveIntegerInput(value) {
  const normalizedValue = String(value ?? '').trim()
  const numberValue = Number(normalizedValue)

  return /^\d+$/.test(normalizedValue) && Number.isSafeInteger(numberValue) && numberValue > 0
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

function normalizeQuantityInputValue(value) {
  const numberValue = Number(value)

  return String(Number.isFinite(numberValue) ? Math.trunc(numberValue) : 1)
}

function mapDuplicateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [createInitialItem()]
  }

  return items.map((item) => ({
    budget_id: getFirstValue(item, ['budget_id', 'budgetId'], ''),
    memo: getFirstValue(item, ['memo'], ''),
    purchase_link: getFirstValue(item, ['purchase_link', 'purchaseLink'], ''),
    quantity: normalizeQuantityInputValue(getFirstValue(item, ['quantity'], '1')),
    unit_price: String(getFirstValue(item, ['unit_price', 'unitPrice'], '')),
  }))
}

function mapRpToDuplicateFormValues(rp) {
  return {
    department_id: '',
    class_department_id: '',
    for_department_id: getFirstValue(rp, ['for_department_id', 'forDepartmentId'], ''),
    for_class_department_id: getFirstValue(
      rp,
      ['for_class_department_id', 'forClassDepartmentId'],
      '',
    ),
    date_required: getTodayDateValue(),
    description: getFirstValue(rp, ['description'], ''),
    vendor_name: getFirstValue(rp, ['vendor_name_snapshot', 'vendor_name'], ''),
    payment_category_id: getFirstValue(rp, ['payment_category_id', 'paymentCategoryId'], ''),
    destination_department_id: getFirstValue(
      rp,
      ['destination_department_id', 'destinationDepartmentId'],
      '',
    ),
    pic_name: getFirstValue(rp, ['pic_name', 'picName'], ''),
    items: mapDuplicateItems(rp?.items),
    notes: 'Submit RP',
  }
}

function DialogCreateRp({
  isOpen = false,
  eyebrow = 'Formulir permintaan pembelian',
  title = 'Buat RP',
  duplicateFrom = null,
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(createInitialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentCategoryOptions, setPaymentCategoryOptions] = useState([])
  const [destinationDepartmentOptions, setDestinationDepartmentOptions] = useState([])
  const [forDepartmentOptions, setForDepartmentOptions] = useState([])
  const [forClassOptions, setForClassOptions] = useState([])
  const [budgetState, setBudgetState] = useState(createEmptyBudgetState)
  const [requesterInfo, setRequesterInfo] = useState(initialRequesterInfo)
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const [restoredDraft, setRestoredDraft] = useState(null)
  const baselineFormValuesRef = useRef(null)
  const draftUserIdRef = useRef('')

  const resetDialogState = useCallback(() => {
    setFormValues(createInitialFormValues())
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setPaymentCategoryOptions([])
    setDestinationDepartmentOptions([])
    setForDepartmentOptions([])
    setForClassOptions([])
    setBudgetState(createEmptyBudgetState())
    setRequesterInfo(initialRequesterInfo)
    setIsOptionsLoading(false)
    setOptionsError('')
    setIsCloseConfirmOpen(false)
    setRestoredDraft(null)
    baselineFormValuesRef.current = null
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  const hasUnsavedChanges = () => {
    const baseline =
      baselineFormValuesRef.current ?? serializeFormValues(createInitialFormValues())

    return serializeFormValues(formValues) !== baseline
  }

  const requestClose = () => {
    if (isSubmitting) {
      return
    }

    if (!hasUnsavedChanges()) {
      handleClose()
      return
    }

    setIsCloseConfirmOpen(true)
  }

  const handleSaveDraftAndClose = () => {
    const isSaved = saveFormDraft(FORM_DRAFT_KEYS.RP_CREATE, draftUserIdRef.current, formValues)

    if (!isSaved) {
      setIsCloseConfirmOpen(false)
      setSubmitError('Draf gagal disimpan di peramban ini. Silakan coba lagi atau kirim RP.')
      return
    }

    handleClose()
  }

  const handleDiscardAndClose = () => {
    if (restoredDraft) {
      clearFormDraft(FORM_DRAFT_KEYS.RP_CREATE, draftUserIdRef.current)
    }

    handleClose()
  }

  const handleDiscardRestoredDraft = () => {
    const initialValues = withRequesterDepartment(createInitialFormValues(), requesterInfo)

    clearFormDraft(FORM_DRAFT_KEYS.RP_CREATE, draftUserIdRef.current)
    baselineFormValuesRef.current = serializeFormValues(initialValues)
    setFormValues(initialValues)
    setFieldErrors({})
    setRestoredDraft(null)
  }

  const updateValue = (fieldName, value) => {
    const isBudgetScopeField =
      fieldName === 'for_department_id' || fieldName === 'for_class_department_id'

    setFormValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [fieldName]: value,
      }

      // Class mengikuti divisi yang baru dipilih; user tetap bisa menggantinya.
      if (fieldName === 'for_department_id') {
        nextValues.for_class_department_id = value
      }

      // Budget mengikuti "Untuk Divisi"/class. Pilihan lama tetap valid hanya jika divisi
      // lama dan baru sama-sama CROSS_BUDGET (keduanya membuka semua anggaran perusahaan).
      const isStillCrossBudget =
        hasCrossBudgetAccess(currentValues.for_department_id, requesterInfo.cross_budget_rules) &&
        hasCrossBudgetAccess(nextValues.for_department_id, requesterInfo.cross_budget_rules)

      if (
        !isBudgetScopeField ||
        isStillCrossBudget ||
        String(currentValues[fieldName]) === String(value)
      ) {
        return nextValues
      }

      return {
        ...nextValues,
        items: currentValues.items.map((item) => ({ ...item, budget_id: '' })),
      }
    })

    setFieldErrors((currentErrors) => {
      const clearedFields =
        fieldName === 'for_department_id' ? [fieldName, 'for_class_department_id'] : [fieldName]

      if (!clearedFields.some((name) => currentErrors[name])) {
        return currentErrors
      }

      return {
        ...currentErrors,
        ...Object.fromEntries(clearedFields.map((name) => [name, ''])),
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

      try {
        const [
          authResponse,
          budgetAccessRules,
          paymentCategoriesResponse,
          destinationDepartmentsResponse,
          directoryDepartments,
        ] = await Promise.all([
          api.auth.me({
            signal: controller.signal,
          }),
          api.budgetAccessRules
            .list(
              {
                page: 1,
                limit: 200,
                module: RP_BUDGET_PURPOSE,
                access_type: CROSS_BUDGET_ACCESS_TYPE,
                is_active: 1,
              },
              {
                signal: controller.signal,
              },
            )
            .then(getRowsFromResponse)
            .catch((error) => {
              if (error.name === 'AbortError') {
                throw error
              }

              // Tanpa akses baca aturan, pakai aturan budget standar (backend tetap memvalidasi).
              return []
            }),
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
          api.directory.departments
            .list(undefined, { signal: controller.signal })
            .then(getRowsFromResponse),
        ])
        const authUser = getAuthUser(authResponse)
        const userRequesterInfo = getUserRequesterInfo(authUser)
        const nextRequesterInfo = {
          ...userRequesterInfo,
          cross_budget_rules: budgetAccessRules,
        }
        const duplicateFormValues = duplicateFrom ? mapRpToDuplicateFormValues(duplicateFrom) : null
        const draftUserId = getFirstValue(authUser, ['id', 'user_id', 'userId'], '')
        const storedDraft = duplicateFormValues
          ? null
          : loadFormDraft(FORM_DRAFT_KEYS.RP_CREATE, draftUserId)
        const draftFormValues = storedDraft ? normalizeDraftFormValues(storedDraft.values) : null
        const initialFormValues = withRequesterDepartment(
          duplicateFormValues ?? draftFormValues ?? createInitialFormValues(),
          nextRequesterInfo,
        )
        const nextBudgetScopeKey = getBudgetScopeKey(nextRequesterInfo, initialFormValues)
        const nextBudgetOptions = await fetchRpBudgetOptions(
          nextBudgetScopeKey,
          controller.signal,
        )
        // Budget dari draf/duplikat yang tidak sesuai konteks RP saat ini dikosongkan.
        const nextFormValues = keepValidBudgetSelections(initialFormValues, nextBudgetOptions)

        let nextPaymentCategoryOptions = mapPaymentCategoryOptions(
          getRowsFromResponse(paymentCategoriesResponse),
        )
        let nextDestinationDepartmentOptions = mapDestinationDepartmentOptions(
          getRowsFromResponse(destinationDepartmentsResponse),
        )

        if (duplicateFormValues) {
          nextPaymentCategoryOptions = ensureOption(
            nextPaymentCategoryOptions,
            duplicateFormValues.payment_category_id,
            getFirstValue(
              duplicateFrom,
              ['payment_category_name_snapshot', 'payment_category_name'],
              '',
            ),
          )
          nextDestinationDepartmentOptions = ensureOption(
            nextDestinationDepartmentOptions,
            duplicateFormValues.destination_department_id,
            [
              getFirstValue(duplicateFrom, ['destination_department_code_snapshot'], ''),
              getFirstValue(duplicateFrom, ['destination_department_name_snapshot'], ''),
              getFirstValue(duplicateFrom, ['destination_department_class_snapshot'], ''),
            ]
              .filter(Boolean)
              .join(' - '),
          )
        }

        draftUserIdRef.current = draftUserId
        baselineFormValuesRef.current = serializeFormValues(nextFormValues)
        setRestoredDraft(storedDraft ? { savedAt: storedDraft.savedAt } : null)
        setRequesterInfo(nextRequesterInfo)
        setFormValues(nextFormValues)
        setPaymentCategoryOptions(nextPaymentCategoryOptions)
        setDestinationDepartmentOptions(nextDestinationDepartmentOptions)
        setForDepartmentOptions(mapForDepartmentOptions(directoryDepartments))
        setForClassOptions(mapForClassOptions(directoryDepartments))
        setBudgetState({ key: nextBudgetScopeKey, options: nextBudgetOptions, error: '' })
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setPaymentCategoryOptions([])
        setDestinationDepartmentOptions([])
        setForDepartmentOptions([])
        setForClassOptions([])
        setBudgetState(createEmptyBudgetState())
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
  }, [isOpen, duplicateFrom])

  const budgetScopeKey = isOpen ? getBudgetScopeKey(requesterInfo, formValues) : ''
  const loadedBudgetScopeKey = budgetState.key
  const isBudgetScopeLoaded = loadedBudgetScopeKey === budgetScopeKey
  const budgetOptions = isBudgetScopeLoaded ? budgetState.options : []
  const budgetOptionsError = isBudgetScopeLoaded ? budgetState.error : ''
  const isBudgetOptionsLoading = Boolean(budgetScopeKey) && !isBudgetScopeLoaded

  // Muat ulang dropdown budget saat konteks berubah (mis. user mengganti "Untuk Divisi"/class).
  useEffect(() => {
    if (!budgetScopeKey || budgetScopeKey === loadedBudgetScopeKey) {
      return undefined
    }

    const controller = new AbortController()

    fetchRpBudgetOptions(budgetScopeKey, controller.signal)
      .then((nextBudgetOptions) => {
        setBudgetState({ key: budgetScopeKey, options: nextBudgetOptions, error: '' })
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return
        }

        setBudgetState({
          key: budgetScopeKey,
          options: [],
          error: error.message || 'Gagal memuat anggaran RP.',
        })
      })

    return () => {
      controller.abort()
    }
  }, [budgetScopeKey, loadedBudgetScopeKey])

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
      nextFieldErrors.date_required = 'Tanggal RP wajib diisi.'
    }

    if (!formValues.description.trim()) {
      nextFieldErrors.description = 'Deskripsi wajib diisi.'
    }

    if (!formValues.vendor_name.trim()) {
      nextFieldErrors.vendor_name = 'Vendor wajib diisi.'
    }

    if (!formValues.payment_category_id) {
      nextFieldErrors.payment_category_id = 'Kategori pembayaran wajib dipilih.'
    }

    if (!formValues.for_department_id) {
      nextFieldErrors.for_department_id = 'Untuk divisi wajib dipilih.'
    }

    if (!formValues.for_class_department_id) {
      nextFieldErrors.for_class_department_id = 'Class wajib dipilih.'
    }

    if (!formValues.destination_department_id) {
      nextFieldErrors.destination_department_id = 'Divisi pemroses wajib dipilih.'
    }

    if (!formValues.pic_name.trim()) {
      nextFieldErrors.pic_name = 'PIC wajib diisi.'
    }

    normalizedItems.forEach((item, index) => {
      if (!item.budget_id) {
        nextFieldErrors[`items.${index}.budget_id`] = 'Anggaran wajib dipilih.'
      }

      if (!item.memo) {
        nextFieldErrors[`items.${index}.memo`] = 'Memo wajib diisi.'
      }

      if (!isPositiveIntegerInput(formValues.items[index]?.quantity)) {
        nextFieldErrors[`items.${index}.quantity`] = 'Jumlah harus berupa bilangan bulat lebih dari 0.'
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
      const response = await api.rp.create({
        company_id: requesterInfo.company_id || undefined,
        department_id: formValues.department_id || undefined,
        class_department_id: formValues.class_department_id || undefined,
        for_department_id: formValues.for_department_id,
        for_class_department_id: formValues.for_class_department_id,
        destination_department_id: formValues.destination_department_id,
        date_required: formValues.date_required,
        vendor_source: 'MANUAL',
        vendor_name: formValues.vendor_name.trim(),
        payment_category_id: formValues.payment_category_id,
        pic_name: formValues.pic_name.trim(),
        description: formValues.description.trim(),
        items: normalizedItems,
        notes: formValues.notes.trim() || 'Submit RP',
      })

      if (restoredDraft) {
        clearFormDraft(FORM_DRAFT_KEYS.RP_CREATE, draftUserIdRef.current)
        setRestoredDraft(null)
      }

      await onCreated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors(error.data.errors)
      }

      setSubmitError(error.message || 'Gagal membuat RP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormDisabled = isSubmitting || isOptionsLoading
  const isWaitingForDepartment = !formValues.for_department_id
  const budgetNoOptionsText = isWaitingForDepartment
    ? 'Pilih "Untuk Divisi" terlebih dahulu untuk memuat anggaran.'
    : 'Anggaran aktif tidak ditemukan untuk konteks RP ini.'
  const totalAmount = formValues.items.reduce((total, item) => {
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unit_price)

    return total + (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0)
  }, 0)

  return (
    <>
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={requestClose}
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
                id="dialog-create-rp-title"
                sx={{ fontWeight: 700, lineHeight: 1.3, color: '#fff' }}
              >
                {title}
              </Typography>
            </Box>

            <IconButton
              aria-label="Tutup dialog"
              onClick={requestClose}
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
            {restoredDraft ? (
              <DraftRestoredBanner
                savedAt={restoredDraft.savedAt}
                disabled={isFormDisabled}
                onDiscard={handleDiscardRestoredDraft}
              />
            ) : null}

            <TabsVendorCreate
              formValues={formValues}
              fieldErrors={fieldErrors}
              isOptionsLoading={isOptionsLoading}
              isFormDisabled={isFormDisabled}
              paymentCategoryOptions={paymentCategoryOptions}
              destinationDepartmentOptions={destinationDepartmentOptions}
              forDepartmentOptions={forDepartmentOptions}
              forClassOptions={forClassOptions}
              updateValue={updateValue}
            />

            <TabsItemsCreate
              formValues={formValues}
              fieldErrors={fieldErrors}
              isOptionsLoading={isOptionsLoading || isBudgetOptionsLoading}
              isFormDisabled={isFormDisabled}
              budgetOptions={budgetOptions}
              budgetNoOptionsText={budgetNoOptionsText}
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
            {budgetOptionsError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {budgetOptionsError}
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
              {isSubmitting ? 'Menyimpan...' : isOptionsLoading ? 'Memuat...' : 'Buat RP'}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <DialogConfirmDraft
        open={isCloseConfirmOpen}
        message="RP ini belum dikirim. Draf akan dimuat kembali saat Anda membuat RP berikutnya."
        onSaveDraft={handleSaveDraftAndClose}
        onDiscard={handleDiscardAndClose}
        onCancel={() => setIsCloseConfirmOpen(false)}
      />
    </>
  )
}

export default DialogCreateRp
