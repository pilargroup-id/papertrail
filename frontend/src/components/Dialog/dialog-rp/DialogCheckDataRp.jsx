import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

import api from '../../../services/api.js'
import TabsInformation from './tabs-create-rp/TabsInformation.jsx'
import TabsItems from './tabs-create-rp/TabsItems.jsx'
import TabsVendor from './tabs-create-rp/TabsVendor.jsx'

const getTodayDateValue = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const date = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${date}`
}

const editInitialItem = () => ({
  rp_request_item_id: '',
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

const rpTabs = [
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
    }
  })
}

function mapPaymentCategoryOptions(categories) {
  return categories.map((category) => {
    const id = getFirstValue(category, ['id', 'payment_category_id'])
    const code = getFirstValue(category, ['code'])
    const name = getFirstValue(category, ['name'], `Category #${id ?? '-'}`)

    return {
      value: id,
      label: [code, name].filter(Boolean).join(' - '),
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
    const remaining = getFirstValue(budget, ['budget_remaining', 'remaining_amount'])

    return {
      value: id,
      label: [code, projectName].filter(Boolean).join(' - '),
      meta: {
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
    rp_request_item_id: getFirstValue(
      item,
      ['rp_request_item_id', 'rpRequestItemId', 'request_item_id', 'requestItemId', 'id'],
      '',
    ),
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

function DialogCheckDataRp({
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
  const [activeTab, setActiveTab] = useState(rpTabs[0].id)
  const [vendorOptions, setVendorOptions] = useState([])
  const [paymentCategoryOptions, setPaymentCategoryOptions] = useState([])
  const [destinationDepartmentOptions, setDestinationDepartmentOptions] = useState([])
  const [budgetOptions, setBudgetOptions] = useState([])
  const [requesterInfo, setRequesterInfo] = useState(initialRequesterInfo)
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(editInitialFormValues())
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setActiveTab(rpTabs[0].id)
    setVendorOptions([])
    setPaymentCategoryOptions([])
    setDestinationDepartmentOptions([])
    setBudgetOptions([])
    setRequesterInfo(initialRequesterInfo)
    setIsOptionsLoading(false)
    setOptionsError('')
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

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

        setRequesterInfo(nextRequesterInfo)
        setFormValues({
          ...nextFormValues,
          department_id: nextFormValues.department_id || nextRequesterInfo.department_id || '',
          class_department_id:
            nextFormValues.class_department_id || nextRequesterInfo.class_department_id || '',
          pic_name: nextFormValues.pic_name || nextRequesterInfo.request_by || '',
        })
        setVendorOptions(nextVendorOptions)
        setPaymentCategoryOptions(nextPaymentCategoryOptions)
        setDestinationDepartmentOptions(nextDestinationDepartmentOptions)
        setBudgetOptions(nextBudgetOptions)
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setVendorOptions([])
        setPaymentCategoryOptions([])
        setDestinationDepartmentOptions([])
        setBudgetOptions([])
        setRequesterInfo(initialRequesterInfo)
        setOptionsError(error.message || 'Gagal memuat pilihan RP.')
      } finally {
        if (!controller.signal.aborted) {
          setIsOptionsLoading(false)
        }
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    loadOptions()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      controller.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, isOpen, rp])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextFieldErrors = {}
    const normalizedItems = formValues.items.map((item) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unit_price)

      return {
        rp_request_item_id: item.rp_request_item_id || undefined,
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

      if (nextFieldErrors.date_required || nextFieldErrors.description) {
        setActiveTab('information')
      } else if (
        nextFieldErrors.vendor_id ||
        nextFieldErrors.payment_category_id ||
        nextFieldErrors.destination_department_id ||
        nextFieldErrors.pic_name
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
      const rpId = rp?.id

      if (rpId === undefined || rpId === null || rpId === '') {
        throw new Error('ID RP tidak tersedia.')
      }

      const response = await api.rp.destinationCheck(rpId, {
        vendor_source: 'MASTER',
        vendor_id: formValues.vendor_id,
        description: formValues.description.trim(),
        items: normalizedItems,
        notes: formValues.notes.trim() || 'Checked by destination checker',
      })

      await onUpdated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors(error.data.errors)
      }

      setSubmitError(error.message || 'Gagal check data RP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isFormDisabled = isSubmitting || isOptionsLoading
  const activeStepIndex = rpTabs.findIndex((tab) => tab.id === activeTab)
  const activeStepLabel = `Step ${activeStepIndex + 1} of ${rpTabs.length}`

  const renderActivePanel = () => {
    if (activeTab === 'information') {
      return (
        <TabsInformation
          requesterInfo={requesterInfo}
          isOptionsLoading={isOptionsLoading}
          isFormDisabled={isFormDisabled}
          formValues={formValues}
          fieldErrors={fieldErrors}
          updateValue={updateValue}
        />
      )
    }

    if (activeTab === 'vendor') {
      return (
        <TabsVendor
          formValues={formValues}
          fieldErrors={fieldErrors}
          isOptionsLoading={isOptionsLoading}
          isFormDisabled={isFormDisabled}
          vendorOptions={vendorOptions}
          paymentCategoryOptions={paymentCategoryOptions}
          destinationDepartmentOptions={destinationDepartmentOptions}
          updateValue={updateValue}
        />
      )
    }

    return (
      <TabsItems
        formValues={formValues}
        fieldErrors={fieldErrors}
        isOptionsLoading={isOptionsLoading}
        isFormDisabled={isFormDisabled}
        budgetOptions={budgetOptions}
        updateItemValue={updateItemValue}
        removeItem={removeItem}
        addItem={addItem}
      />
    )
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type entity-form-popup--frp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-rp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">
                {eyebrow} - {activeStepLabel}
              </p>
              <h2 className="dashboard-popup__title" id="dialog-edit-rp-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="frp-dialog__tabbed-container">
                    <div className="frp-dialog__tabs-shell">
                      <Tabs
                        value={activeTab}
                        onChange={(_, nextValue) => setActiveTab(nextValue)}
                        textColor="primary"
                        indicatorColor="primary"
                        aria-label="RP tabs"
                        variant="fullWidth"
                        className="frp-dialog__tabs"
                        sx={{
                          minHeight: 44,
                          '& .MuiTabs-flexContainer': {
                            gap: '0.4rem',
                          },
                          '& .MuiTabs-indicator': {
                            height: 2,
                            borderRadius: 999,
                            backgroundColor: 'var(--primary-blue)',
                          },
                        }}
                      >
                        {rpTabs.map((tab) => (
                          <Tab
                            key={tab.id}
                            id={`rp-edit-tab-${tab.id}`}
                            aria-controls={`rp-edit-panel-${tab.id}`}
                            value={tab.id}
                            label={tab.label}
                            disableRipple
                            className="frp-dialog__mui-tab"
                            sx={{
                              minHeight: 44,
                              borderRadius: '10px 10px 0 0',
                              color: '#607089',
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              letterSpacing: 0,
                              textTransform: 'none',
                              transition: 'background-color 0.2s ease, color 0.2s ease',
                              '&.Mui-selected': {
                                color: 'var(--primary-blue)',
                                backgroundColor: 'rgba(26, 42, 87, 0.08)',
                              },
                            }}
                          />
                        ))}
                      </Tabs>
                    </div>

                    <div
                      className="frp-dialog__panel"
                      id={`rp-edit-panel-${activeTab}`}
                      role="tabpanel"
                      aria-labelledby={`rp-edit-tab-${activeTab}`}
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
              {isSubmitting ? 'Checking...' : isOptionsLoading ? 'Loading...' : 'Check Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCheckDataRp
