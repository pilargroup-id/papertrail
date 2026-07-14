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
  date_required: getTodayDateValue(),
  description: '',
  vendor_id: '',
  payment_category_id: '',
  destination_department_id: '',
  pic_name: '',
  items: [createInitialItem()],
  notes: 'Submit RP',
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
    company: [companyCode, companyName].filter(Boolean).join(' - '),
    division: [departmentCode, departmentName].filter(Boolean).join(' - '),
    request_by: user.name ?? user.full_name ?? user.username ?? '',
    department_id: departmentId,
    class_department_id: classDepartmentId,
  }
}

function isPositiveIntegerInput(value) {
  const normalizedValue = String(value ?? '').trim()
  const numberValue = Number(normalizedValue)

  return /^\d+$/.test(normalizedValue) && Number.isSafeInteger(numberValue) && numberValue > 0
}

function DialogCreateRp({
  isOpen = false,
  eyebrow = 'Form request purchase',
  title = 'Create RP',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(createInitialFormValues)
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
    setFormValues(createInitialFormValues())
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
          vendorsResponse,
          paymentCategoriesResponse,
          destinationDepartmentsResponse,
          budgetsResponse,
        ] = await Promise.all([
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
        const authUser = getAuthUser(authResponse)
        const nextRequesterInfo = getUserRequesterInfo(authUser)

        setRequesterInfo(nextRequesterInfo)
        setFormValues((currentValues) => ({
          ...currentValues,
          department_id: currentValues.department_id || nextRequesterInfo.department_id || '',
          class_department_id:
            currentValues.class_department_id || nextRequesterInfo.class_department_id || '',
          pic_name: currentValues.pic_name || nextRequesterInfo.request_by || '',
        }))
        setVendorOptions(mapVendorOptions(getRowsFromResponse(vendorsResponse)))
        setPaymentCategoryOptions(
          mapPaymentCategoryOptions(getRowsFromResponse(paymentCategoriesResponse)),
        )
        setDestinationDepartmentOptions(
          mapDestinationDepartmentOptions(getRowsFromResponse(destinationDepartmentsResponse)),
        )
        setBudgetOptions(mapBudgetOptions(getRowsFromResponse(budgetsResponse)))
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
  }, [handleClose, isOpen])

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
      const response = await api.rp.create({
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
        notes: formValues.notes.trim() || 'Submit RP',
      })

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
        aria-labelledby="dialog-create-rp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">
                {eyebrow} - {activeStepLabel}
              </p>
              <h2 className="dashboard-popup__title" id="dialog-create-rp-title">
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
                            id={`rp-tab-${tab.id}`}
                            aria-controls={`rp-panel-${tab.id}`}
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
                      id={`rp-panel-${activeTab}`}
                      role="tabpanel"
                      aria-labelledby={`rp-tab-${activeTab}`}
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
              {isSubmitting ? 'Creating...' : isOptionsLoading ? 'Loading...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateRp
