import { useEffect, useEffectEvent, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import TextField from '../../forms/TextField.jsx'
import Dropdown from '../../forms/dropdown/Dropdown.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'

import { Code, FileText01, TrendingUp } from '../../layoute/TemplateIcons.jsx'

const currentDate = new Date()
const currentYear = currentDate.getFullYear()
const currentMonth = currentDate.getMonth() + 1

const initialFormValues = {
  budget_code: '',
  project_name: '',
  company_id: '',
  department_id: '',
  class_department_id: '',
  budget_type_id: '',
  budget_amount: '',
  period_year: currentYear,
  period_month: currentMonth,
}

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const yearOptions = Array.from({ length: 7 }, (_, index) => {
  const year = currentYear - 2 + index

  return {
    value: year,
    label: String(year),
  }
})

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

function findOption(options, value) {
  return options.find((option) => String(option.value) === String(value))
}

function appendMissingOption(options, option) {
  if (!option?.value || findOption(options, option.value)) {
    return options
  }

  return [...options, option]
}

function getAuthUser(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function mapCompanyOptions(companies) {
  return companies.map((company) => {
    const id = getFirstValue(company, ['id', 'company_id', 'business_unit_id', 'uuid'])
    const code = getFirstValue(company, ['code', 'company_code', 'business_unit_code'])
    const name = getFirstValue(company, ['name', 'company_name', 'business_unit_name'], `Company #${id ?? '-'}`)
    const label = [code, name].filter(Boolean).join(' - ')

    return {
      value: id,
      label,
      isPrimary: Number(company?.is_primary) === 1,
      meta: {
        code,
        name,
      },
    }
  })
}

function mapDepartmentOptions(departments) {
  return departments.map((department) => {
    const id = getFirstValue(department, ['id', 'department_id', 'uuid'])
    const code = getFirstValue(department, ['code', 'department_code'])
    const name = getFirstValue(
      department,
      ['name', 'department_name', 'label'],
      `Department #${id ?? '-'}`,
    )
    const className = getFirstValue(
      department,
      ['class_name', 'department_class', 'class', 'department_class_snapshot'],
      name,
    )
    const label = [code, name].filter(Boolean).join(' - ')

    return {
      value: id,
      label,
      isPrimary: Number(department?.is_primary) === 1,
      meta: {
        code,
        name,
        className,
      },
    }
  })
}

function mapClassOptions(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : []
  const classItems =
    departments.length > 0
      ? departments
      : [
          {
            id: user?.department_id,
            name: user?.department_class ?? user?.department,
            class: user?.department_class ?? user?.department,
            code: user?.department_code,
            is_primary: 1,
          },
        ].filter((department) => department.id || department.name || department.class)

  const uniqueOptions = new Map()

  classItems.forEach((department) => {
    const id = getFirstValue(department, ['id', 'department_id', 'uuid'], user?.department_id)
    const code = getFirstValue(department, ['code', 'department_code'], user?.department_code)
    const className = getFirstValue(
      department,
      ['class', 'department_class', 'class_name', 'name', 'department_name'],
      user?.department_class ?? user?.department ?? `Class #${id ?? '-'}`,
    )
    const optionKey = `${id}-${className}`

    if (uniqueOptions.has(optionKey)) {
      return
    }

    uniqueOptions.set(optionKey, {
      value: id,
      label: [code, className].filter(Boolean).join(' - '),
      isPrimary: Number(department?.is_primary) === 1,
      meta: {
        code,
        name: className,
        className,
      },
    })
  })

  return Array.from(uniqueOptions.values())
}

function mapBudgetTypeOptions(budgetTypes) {
  return budgetTypes.map((budgetType) => {
    const id = getFirstValue(budgetType, ['id', 'budget_type_id'])
    const code = getFirstValue(budgetType, ['code', 'budget_type_code'])
    const name = getFirstValue(
      budgetType,
      ['name', 'budget_type_name'],
      `Budget type #${id ?? '-'}`,
    )
    const label = [code, name].filter(Boolean).join(' - ')

    return {
      value: id,
      label,
    }
  })
}

function mapBudgetToFormValues(budget) {
  return {
    budget_code: getFirstValue(budget, ['budget_code']),
    project_name: getFirstValue(budget, ['project_name']),
    company_id: getFirstValue(budget, ['company_id']),
    department_id: getFirstValue(budget, ['department_id']),
    class_department_id: getFirstValue(budget, ['class_department_id']),
    budget_type_id: getFirstValue(budget, ['budget_type_id']),
    budget_amount: getFirstValue(budget, ['budget_amount']),
    period_year: getFirstValue(budget, ['period_year'], currentYear),
    period_month: getFirstValue(budget, ['period_month'], currentMonth),
  }
}

function makeBudgetCompanyOption(budget) {
  const value = getFirstValue(budget, ['company_id'])
  const code = getFirstValue(budget, ['company_code_snapshot'])
  const name = getFirstValue(budget, ['company_name_snapshot'])
  const label = [code, name].filter(Boolean).join(' - ') || value

  return {
    value,
    label,
    meta: {
      code,
      name,
    },
  }
}

function makeBudgetDepartmentOption(budget) {
  const value = getFirstValue(budget, ['department_id'])
  const code = getFirstValue(budget, ['department_code_snapshot'])
  const name = getFirstValue(budget, ['department_name_snapshot'])
  const className = getFirstValue(budget, ['department_class_snapshot'], name)
  const label = [code, name].filter(Boolean).join(' - ') || value

  return {
    value,
    label,
    meta: {
      code,
      name,
      className,
    },
  }
}

function makeBudgetClassOption(budget) {
  const value = getFirstValue(budget, ['class_department_id'])
  const code = getFirstValue(budget, ['class_code_snapshot'])
  const name = getFirstValue(budget, ['class_name_snapshot'])
  const className = getFirstValue(budget, ['class_class_snapshot'], name)
  const label = [code, name].filter(Boolean).join(' - ') || value

  return {
    value,
    label,
    meta: {
      code,
      name,
      className,
    },
  }
}

function makeBudgetTypeOption(budget) {
  const value = getFirstValue(budget, ['budget_type_id'])
  const code = getFirstValue(budget, ['budget_type_code'])
  const name = getFirstValue(budget, ['budget_type_name'])
  const label = [code, name].filter(Boolean).join(' - ') || value

  return {
    value,
    label,
  }
}

function normalizeBudgetNumber(value, fallback = 0) {
  const nextValue = Number(value)

  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : fallback
}

function DialogEditBudgets({
  isOpen = false,
  eyebrow = 'Budgets',
  title = 'Edit Budget',
  user = null,
  vendor = null,
  budgetType = null,
  budget = null,
  onClose,
  onUpdated,
}) {
  const resolvedBudget = budget ?? budgetType ?? vendor ?? user
  const [formValues, setFormValues] = useState(() => mapBudgetToFormValues(resolvedBudget))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [companyOptions, setCompanyOptions] = useState([])
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [classOptions, setClassOptions] = useState([])
  const [budgetTypeOptions, setBudgetTypeOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const resetDialogState = () => {
    setFormValues(initialFormValues)
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setCompanyOptions([])
    setDepartmentOptions([])
    setClassOptions([])
    setBudgetTypeOptions([])
    setIsOptionsLoading(false)
    setOptionsError('')
  }

  const handleClose = () => {
    resetDialogState()
    onClose?.()
  }
  const handleCloseEvent = useEffectEvent(handleClose)

  const updateValue = (fieldName, value) => {
    setFormValues((currentValues) => {
      return {
        ...currentValues,
        [fieldName]: value,
      }
    })

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

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const [authResponse, budgetTypesResponse] = await Promise.all([
          api.auth.me(
            {
              signal: controller.signal,
            },
          ),
          api.budgetTypes.list(
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
        const mappedCompanyOptions = mapCompanyOptions(
          Array.isArray(authUser?.companies) ? authUser.companies : [],
        )
        const mappedDepartmentOptions = mapDepartmentOptions(
          Array.isArray(authUser?.departments)
            ? authUser.departments
            : [
                {
                  id: authUser?.department_id,
                  name: authUser?.department,
                  class: authUser?.department_class,
                  code: authUser?.department_code,
                  is_primary: 1,
                },
              ].filter((department) => department.id || department.name),
        )
        const mappedClassOptions = mapClassOptions(authUser)
        const mappedBudgetTypeOptions = mapBudgetTypeOptions(getRowsFromResponse(budgetTypesResponse))
        const nextCompanyOptions = appendMissingOption(
          mappedCompanyOptions,
          makeBudgetCompanyOption(resolvedBudget),
        )
        const nextDepartmentOptions = appendMissingOption(
          mappedDepartmentOptions,
          makeBudgetDepartmentOption(resolvedBudget),
        )
        const nextClassOptions = appendMissingOption(
          mappedClassOptions,
          makeBudgetClassOption(resolvedBudget),
        )
        const nextBudgetTypeOptions = appendMissingOption(
          mappedBudgetTypeOptions,
          makeBudgetTypeOption(resolvedBudget),
        )
        const primaryCompany = nextCompanyOptions.find((option) => option.isPrimary)
        const primaryDepartment = nextDepartmentOptions.find((option) => option.isPrimary)
        const primaryClass = nextClassOptions.find((option) => option.isPrimary)

        setCompanyOptions(nextCompanyOptions)
        setDepartmentOptions(nextDepartmentOptions)
        setClassOptions(nextClassOptions)
        setBudgetTypeOptions(nextBudgetTypeOptions)
        setFormValues((currentValues) => ({
          ...currentValues,
          company_id:
            currentValues.company_id ||
            primaryCompany?.value ||
            nextCompanyOptions[0]?.value ||
            '',
          department_id:
            currentValues.department_id ||
            primaryDepartment?.value ||
            nextDepartmentOptions[0]?.value ||
            '',
          class_department_id:
            currentValues.class_department_id ||
            primaryClass?.value ||
            nextClassOptions[0]?.value ||
            '',
        }))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setCompanyOptions([])
        setDepartmentOptions([])
        setClassOptions([])
        setBudgetTypeOptions([])
        setOptionsError(error.message || 'Gagal memuat scope user dan budget type.')
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
  }, [isOpen, resolvedBudget])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedBudgetCode = formValues.budget_code.trim().toUpperCase()
    const normalizedProjectName = formValues.project_name.trim()
    const budgetAmount = Number(formValues.budget_amount)
    const budgetId = resolvedBudget?.id
    const selectedCompany = findOption(companyOptions, formValues.company_id)
    const selectedDepartment = findOption(departmentOptions, formValues.department_id)
    const selectedClass = findOption(classOptions, formValues.class_department_id)
    const nextFieldErrors = {}

    if (budgetId === undefined || budgetId === null) {
      setSubmitError('Data budget tidak ditemukan.')
      return
    }

    if (!normalizedBudgetCode) {
      nextFieldErrors.budget_code = 'Budget code wajib diisi.'
    }

    if (!normalizedProjectName) {
      nextFieldErrors.project_name = 'Project name wajib diisi.'
    }

    if (!formValues.company_id) {
      nextFieldErrors.company_id = 'Company wajib dipilih.'
    }

    if (!formValues.department_id) {
      nextFieldErrors.department_id = 'Department wajib dipilih.'
    }

    if (!formValues.class_department_id) {
      nextFieldErrors.class_department_id = 'Class wajib dipilih.'
    }

    if (!formValues.budget_type_id) {
      nextFieldErrors.budget_type_id = 'Budget type wajib dipilih.'
    }

    if (!Number.isFinite(budgetAmount) || budgetAmount < 0) {
      nextFieldErrors.budget_amount = 'Budget amount harus berupa angka valid.'
    }

    if (!formValues.period_year) {
      nextFieldErrors.period_year = 'Period year wajib dipilih.'
    }

    if (!formValues.period_month) {
      nextFieldErrors.period_month = 'Period month wajib dipilih.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const budgetReserved = normalizeBudgetNumber(resolvedBudget?.budget_reserved)
      const budgetUsed = normalizeBudgetNumber(resolvedBudget?.budget_used)
      const budgetRemaining = Math.max(budgetAmount - budgetReserved - budgetUsed, 0)
      const response = await api.budgets.update(budgetId, {
        budget_code: normalizedBudgetCode,
        company_id: formValues.company_id,
        company_code_snapshot: selectedCompany?.meta?.code ?? '',
        company_name_snapshot: selectedCompany?.meta?.name ?? selectedCompany?.label ?? '',
        department_id: formValues.department_id,
        department_name_snapshot: selectedDepartment?.meta?.name ?? selectedDepartment?.label ?? '',
        department_class_snapshot:
          selectedDepartment?.meta?.className ?? selectedDepartment?.meta?.name ?? '',
        department_code_snapshot: selectedDepartment?.meta?.code ?? '',
        class_department_id: formValues.class_department_id,
        class_name_snapshot: selectedClass?.meta?.name ?? selectedClass?.label ?? '',
        class_class_snapshot: selectedClass?.meta?.className ?? selectedClass?.meta?.name ?? '',
        class_code_snapshot: selectedClass?.meta?.code ?? '',
        budget_type_id: formValues.budget_type_id,
        project_name: normalizedProjectName,
        budget_amount: budgetAmount,
        budget_reserved: budgetReserved,
        budget_used: budgetUsed,
        budget_remaining: budgetRemaining,
        period_year: Number(formValues.period_year),
        period_month: Number(formValues.period_month),
      })

      await onUpdated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          budget_code: error.data.errors.budget_code || '',
          project_name: error.data.errors.project_name || '',
          company_id: error.data.errors.company_id || '',
          department_id: error.data.errors.department_id || '',
          class_department_id: error.data.errors.class_department_id || '',
          budget_type_id: error.data.errors.budget_type_id || '',
          budget_amount: error.data.errors.budget_amount || '',
          period_year: error.data.errors.period_year || '',
          period_month: error.data.errors.period_month || '',
        })
      }

      setSubmitError(error.message || 'Gagal memperbarui budget.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isInitialFormDisabled = isSubmitting || isOptionsLoading
  const isFormDisabled = isInitialFormDisabled

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-budget-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-edit-budget-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid register-user-popup__grid--vendor-banks">
                    <div className="register-user-popup__field">
                      <TextField
                        label="Budget Code"
                        value={formValues.budget_code}
                        placeholder="Input budget code"
                        leftIcon={Code}
                        required
                        disabled={isSubmitting}
                        error={fieldErrors.budget_code}
                        onChange={(event) => updateValue('budget_code', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Project Name"
                        value={formValues.project_name}
                        placeholder="Input project name"
                        leftIcon={FileText01}
                        required
                        disabled={isSubmitting}
                        error={fieldErrors.project_name}
                        onChange={(event) => updateValue('project_name', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <Dropdown
                        label="Company Name"
                        value={formValues.company_id}
                        options={companyOptions}
                        placeholder={isOptionsLoading ? 'Memuat company...' : 'Pilih company'}
                        required
                        disabled={isInitialFormDisabled}
                        error={fieldErrors.company_id}
                        onChange={(value) => updateValue('company_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <DropdownSearch
                        label="Department"
                        value={formValues.department_id}
                        options={departmentOptions}
                        placeholder={isOptionsLoading ? 'Memuat department...' : 'Pilih department'}
                        searchPlaceholder="Cari department..."
                        emptyMessage="Department aktif tidak ditemukan."
                        required
                        disabled={isInitialFormDisabled}
                        error={fieldErrors.department_id}
                        onChange={(value) => updateValue('department_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <Dropdown
                        label="Class"
                        value={formValues.class_department_id}
                        options={classOptions}
                        placeholder={isOptionsLoading ? 'Memuat class...' : 'Pilih class'}
                        required
                        disabled={isInitialFormDisabled}
                        error={fieldErrors.class_department_id}
                        onChange={(value) => updateValue('class_department_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <DropdownSearch
                        label="Budget Type"
                        value={formValues.budget_type_id}
                        options={budgetTypeOptions}
                        placeholder={
                          isOptionsLoading ? 'Memuat budget type...' : 'Pilih budget type'
                        }
                        searchPlaceholder="Cari budget type..."
                        emptyMessage="Budget type aktif tidak ditemukan."
                        required
                        disabled={isInitialFormDisabled}
                        error={fieldErrors.budget_type_id}
                        onChange={(value) => updateValue('budget_type_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Budget Amount"
                        type="number"
                        min="0"
                        step="1"
                        value={formValues.budget_amount}
                        placeholder="Input budget amount"
                        leftIcon={TrendingUp}
                        required
                        disabled={isSubmitting}
                        error={fieldErrors.budget_amount}
                        onChange={(event) => updateValue('budget_amount', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <Dropdown
                        label="Period Year"
                        value={formValues.period_year}
                        options={yearOptions}
                        placeholder="Pilih tahun"
                        required
                        disabled={isSubmitting}
                        error={fieldErrors.period_year}
                        onChange={(value) => updateValue('period_year', value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <Dropdown
                        label="Period Month"
                        value={formValues.period_month}
                        options={monthOptions}
                        placeholder="Pilih bulan"
                        required
                        disabled={isSubmitting}
                        error={fieldErrors.period_month}
                        onChange={(value) => updateValue('period_month', value)}
                      />
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
              {isSubmitting ? 'Saving...' : isOptionsLoading ? 'Loading...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditBudgets
