import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { TrendingUp, XClose } from '../../layoute/TemplateIcons.jsx'
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

const RP_BUDGET_ACCESS_MODULE = 'RP'
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
        budgetRemaining: remaining,
      },
    }
  })
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
    const moduleName = normalizeText(getFirstValue(rule, ['module'], RP_BUDGET_ACCESS_MODULE))
    const accessType = normalizeText(
      getFirstValue(rule, ['access_type', 'accessType'], CROSS_BUDGET_ACCESS_TYPE),
    )

    return (
      isActiveRecord(rule) &&
      moduleName === RP_BUDGET_ACCESS_MODULE &&
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
  const [vendorOptions, setVendorOptions] = useState([])
  const [paymentCategoryOptions, setPaymentCategoryOptions] = useState([])
  const [destinationDepartmentOptions, setDestinationDepartmentOptions] = useState([])
  const [budgetOptions, setBudgetOptions] = useState([])
  const [userDirectory, setUserDirectory] = useState([])
  const [, setRequesterInfo] = useState(initialRequesterInfo)
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const picOptions = useMemo(
    () => mapPicOptions(userDirectory, formValues.destination_department_id),
    [userDirectory, formValues.destination_department_id],
  )

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
    setFormValues(createInitialFormValues())
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setVendorOptions([])
    setPaymentCategoryOptions([])
    setDestinationDepartmentOptions([])
    setBudgetOptions([])
    setUserDirectory([])
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
        currentValues.destination_department_id !== value
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
          budgetAccessRulesResponse,
          vendorsResponse,
          paymentCategoriesResponse,
          destinationDepartmentsResponse,
          usersResponse,
        ] = await Promise.all([
          api.auth.me({
            signal: controller.signal,
          }),
          api.budgetAccessRules.list(
            {
              page: 1,
              limit: 200,
              module: RP_BUDGET_ACCESS_MODULE,
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
          api.directory.users.list(undefined, {
            signal: controller.signal,
          }),
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

        setRequesterInfo(nextRequesterInfo)
        setFormValues((currentValues) => ({
          ...currentValues,
          department_id: currentValues.department_id || nextRequesterInfo.department_id || '',
          class_department_id:
            currentValues.class_department_id || nextRequesterInfo.class_department_id || '',
        }))
        setVendorOptions(mapVendorOptions(getRowsFromResponse(vendorsResponse)))
        setPaymentCategoryOptions(
          mapPaymentCategoryOptions(getRowsFromResponse(paymentCategoriesResponse)),
        )
        setDestinationDepartmentOptions(
          mapDestinationDepartmentOptions(getRowsFromResponse(destinationDepartmentsResponse)),
        )
        setBudgetOptions(mapBudgetOptions(visibleBudgetRows))
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
  const totalAmount = formValues.items.reduce((total, item) => {
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unit_price)

    return total + (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0)
  }, 0)

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation">
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
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-create-rp-title">
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
                    <TabsVendor
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
                    <TabsItems
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
                <span className="frp-dialog__total-amount-label">Total RP</span>
                <strong>{formatRupiah(totalAmount)}</strong>
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

export default DialogCreateRp
