import { useEffect, useState } from 'react'
import { InputAdornment } from '@mui/material'

import api from '../../../services/api.js'
import {
  BudgetFieldFull,
  BudgetFieldGrid,
  BudgetFormDialog,
  BudgetSelectField,
  BudgetTextField,
} from './BudgetFormFields.jsx'
import {
  currentMonth,
  currentYear,
  findOption,
  getFirstValue,
  getRowsFromResponse,
  joinLabel,
  loadActiveBudgetTypeOptions,
  monthOptions,
  yearOptions,
} from './budgetFormUtils.js'

const initialFormValues = {
  project_name: '',
  company_id: '',
  department_id: '',
  class_department_id: '',
  budget_type_id: '',
  budget_amount: '',
  period_year: currentYear,
  period_month: currentMonth,
}

function generateCodeFromName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapCompanyOptions(companies) {
  return companies.map((company) => {
    const id = getFirstValue(company, ['id', 'company_id', 'business_unit_id', 'uuid'])
    const code = getFirstValue(company, ['code', 'company_code', 'business_unit_code'])
    const name = getFirstValue(company, ['name', 'company_name', 'business_unit_name'], `Company #${id ?? '-'}`)

    return {
      value: id,
      label: joinLabel(code, name),
      isPrimary: Number(company?.is_primary) === 1,
      meta: { code, name },
    }
  })
}

function mapDepartmentOptions(departments) {
  return departments.map((department) => {
    const id = getFirstValue(department, ['id', 'department_id', 'uuid'])
    const code = getFirstValue(department, ['code', 'department_code'])
    const name = getFirstValue(department, ['name', 'department_name', 'label'], `Department #${id ?? '-'}`)
    const className = getFirstValue(
      department,
      ['class_name', 'department_class', 'class', 'department_class_snapshot'],
      name,
    )

    return {
      value: id,
      label: joinLabel(code, name),
      isPrimary: Number(department?.is_primary) === 1,
      meta: { code, name, className },
    }
  })
}

function mapClassOptions(departments) {
  const uniqueOptions = new Map()

  departments.forEach((department) => {
    const id = getFirstValue(department, ['id', 'department_id', 'uuid'])
    const code = getFirstValue(department, ['code', 'department_code'])
    const className = getFirstValue(
      department,
      ['class', 'department_class', 'class_name', 'name', 'department_name'],
      `Class #${id ?? '-'}`,
    )
    const optionKey = `${id}-${className}`

    if (!uniqueOptions.has(optionKey)) {
      uniqueOptions.set(optionKey, {
        value: id,
        label: joinLabel(code, className),
        isPrimary: Number(department?.is_primary) === 1,
        meta: { code, name: className, className },
      })
    }
  })

  return Array.from(uniqueOptions.values())
}

function pickDefaultValue(options) {
  return (options.find((option) => option.isPrimary) ?? options[0])?.value ?? ''
}

function CreateBudgetForm({ eyebrow, title, onClose, onCreated }) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [companyOptions, setCompanyOptions] = useState([])
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [classOptions, setClassOptions] = useState([])
  const [budgetTypeOptions, setBudgetTypeOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState('')

  const updateValue = (fieldName, value) => {
    setFormValues((currentValues) => ({ ...currentValues, [fieldName]: value }))
    setFieldErrors((currentErrors) =>
      currentErrors[fieldName] ? { ...currentErrors, [fieldName]: '' } : currentErrors,
    )
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadOptions() {
      try {
        const [companiesResponse, departmentsResponse, nextBudgetTypeOptions] = await Promise.all([
          api.directory.companies.list(undefined, { signal: controller.signal }),
          api.directory.departments.list(undefined, { signal: controller.signal }),
          loadActiveBudgetTypeOptions(controller.signal),
        ])
        const departments = getRowsFromResponse(departmentsResponse)
        const nextCompanyOptions = mapCompanyOptions(getRowsFromResponse(companiesResponse))
        const nextDepartmentOptions = mapDepartmentOptions(departments)
        const nextClassOptions = mapClassOptions(departments)

        setCompanyOptions(nextCompanyOptions)
        setDepartmentOptions(nextDepartmentOptions)
        setClassOptions(nextClassOptions)
        setBudgetTypeOptions(nextBudgetTypeOptions)
        setFormValues((currentValues) => ({
          ...currentValues,
          company_id: currentValues.company_id || pickDefaultValue(nextCompanyOptions),
          department_id: currentValues.department_id || pickDefaultValue(nextDepartmentOptions),
          class_department_id:
            currentValues.class_department_id || pickDefaultValue(nextClassOptions),
        }))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setOptionsError(error.message || 'Gagal memuat scope user dan budget type.')
      } finally {
        if (!controller.signal.aborted) {
          setIsOptionsLoading(false)
        }
      }
    }

    loadOptions()

    return () => controller.abort()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting || isOptionsLoading) {
      return
    }

    const normalizedProjectName = formValues.project_name.trim()
    const normalizedBudgetCode = generateCodeFromName(normalizedProjectName)
    const amountText = String(formValues.budget_amount).trim()
    const budgetAmount = Number(amountText)
    const selectedCompany = findOption(companyOptions, formValues.company_id)
    const selectedDepartment = findOption(departmentOptions, formValues.department_id)
    const selectedClass = findOption(classOptions, formValues.class_department_id)
    const nextFieldErrors = {}

    if (!normalizedProjectName) {
      nextFieldErrors.project_name = 'Budget name wajib diisi.'
    } else if (!normalizedBudgetCode) {
      nextFieldErrors.project_name = 'Budget name harus mengandung huruf atau angka.'
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

    if (!amountText || !Number.isFinite(budgetAmount) || budgetAmount < 0) {
      nextFieldErrors.budget_amount = 'Budget amount harus berupa angka valid.'
    }

    if (!formValues.period_year) {
      nextFieldErrors.period_year = 'Period year wajib dipilih.'
    }

    if (!formValues.period_month) {
      nextFieldErrors.period_month = 'Period month wajib dipilih.'
    }

    setFieldErrors(nextFieldErrors)
    setSubmitError('')

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await api.budgets.create({
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
        budget_reserved: 0,
        budget_used: 0,
        budget_remaining: budgetAmount,
        period_year: Number(formValues.period_year),
        period_month: Number(formValues.period_month),
      })

      await onCreated?.(response)
      onClose?.()
    } catch (error) {
      const errors = error?.data?.errors

      if (errors) {
        setFieldErrors({
          // Budget code dibuat dari budget name, jadi error-nya ditampilkan di field nama.
          project_name: errors.project_name || errors.budget_code || '',
          company_id: errors.company_id || '',
          department_id: errors.department_id || '',
          class_department_id: errors.class_department_id || '',
          budget_type_id: errors.budget_type_id || '',
          budget_amount: errors.budget_amount || '',
          period_year: errors.period_year || '',
          period_month: errors.period_month || '',
        })
      }

      setSubmitError(error.message || 'Gagal membuat budget.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isScopeDisabled = isSubmitting || isOptionsLoading

  return (
    <BudgetFormDialog
      eyebrow={eyebrow}
      title={title}
      onClose={onClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={isOptionsLoading}
      submitLabel={isOptionsLoading ? 'Loading...' : 'Create'}
      submittingLabel="Creating..."
      errors={[optionsError, submitError]}
    >
      <BudgetFieldGrid>
        <BudgetFieldFull>
          <BudgetTextField
            autoFocus
            required
            label="Budget Name"
            placeholder="Input project name"
            value={formValues.project_name}
            disabled={isSubmitting}
            error={fieldErrors.project_name}
            helperText={
              formValues.project_name.trim()
                ? `Budget code: ${generateCodeFromName(formValues.project_name) || '-'}`
                : undefined
            }
            onChange={(event) => updateValue('project_name', event.target.value)}
          />
        </BudgetFieldFull>

        <BudgetSelectField
          required
          disableClearable
          label="Company"
          placeholder="Pilih company"
          loadingText="Memuat company..."
          noOptionsText="Company tidak ditemukan."
          value={formValues.company_id}
          options={companyOptions}
          loading={isOptionsLoading}
          disabled={isScopeDisabled}
          error={fieldErrors.company_id}
          onChange={(value) => updateValue('company_id', value)}
        />
        <BudgetSelectField
          required
          label="Budget Type"
          placeholder="Pilih budget type"
          loadingText="Memuat budget type..."
          noOptionsText="Budget type aktif tidak ditemukan."
          value={formValues.budget_type_id}
          options={budgetTypeOptions}
          loading={isOptionsLoading}
          disabled={isScopeDisabled}
          error={fieldErrors.budget_type_id}
          onChange={(value) => updateValue('budget_type_id', value)}
        />

        <BudgetSelectField
          required
          disableClearable
          label="Department"
          placeholder="Pilih department"
          loadingText="Memuat department..."
          noOptionsText="Department aktif tidak ditemukan."
          value={formValues.department_id}
          options={departmentOptions}
          loading={isOptionsLoading}
          disabled={isScopeDisabled}
          error={fieldErrors.department_id}
          onChange={(value) => updateValue('department_id', value)}
        />
        <BudgetSelectField
          required
          disableClearable
          label="Class"
          placeholder="Pilih class"
          loadingText="Memuat class..."
          noOptionsText="Class tidak ditemukan."
          value={formValues.class_department_id}
          options={classOptions}
          loading={isOptionsLoading}
          disabled={isScopeDisabled}
          error={fieldErrors.class_department_id}
          onChange={(value) => updateValue('class_department_id', value)}
        />

        <BudgetFieldFull>
          <BudgetTextField
            required
            type="number"
            label="Budget Amount"
            placeholder="0"
            value={formValues.budget_amount}
            disabled={isSubmitting}
            error={fieldErrors.budget_amount}
            onChange={(event) => updateValue('budget_amount', event.target.value)}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> },
              htmlInput: { min: 0, step: 1, inputMode: 'numeric' },
            }}
          />
        </BudgetFieldFull>

        <BudgetSelectField
          required
          disableClearable
          label="Period Year"
          placeholder="Pilih tahun"
          value={formValues.period_year}
          options={yearOptions}
          disabled={isSubmitting}
          error={fieldErrors.period_year}
          onChange={(value) => updateValue('period_year', value)}
        />
        <BudgetSelectField
          required
          disableClearable
          label="Period Month"
          placeholder="Pilih bulan"
          value={formValues.period_month}
          options={monthOptions}
          disabled={isSubmitting}
          error={fieldErrors.period_month}
          onChange={(value) => updateValue('period_month', value)}
        />
      </BudgetFieldGrid>
    </BudgetFormDialog>
  )
}

function DialogCreateBudgets({
  isOpen = false,
  eyebrow = 'Budgets',
  title = 'Create Budget',
  onClose,
  onCreated,
}) {
  // Form dirender ulang setiap kali dialog dibuka, sehingga state selalu bersih.
  if (!isOpen) {
    return null
  }

  return <CreateBudgetForm eyebrow={eyebrow} title={title} onClose={onClose} onCreated={onCreated} />
}

export default DialogCreateBudgets
