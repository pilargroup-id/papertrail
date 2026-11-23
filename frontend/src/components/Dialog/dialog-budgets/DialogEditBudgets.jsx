import { useEffect, useState } from 'react'

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
  joinLabel,
  loadActiveBudgetTypeOptions,
  monthOptions,
  yearOptions,
} from './budgetFormUtils.js'

const scopeHelperText = 'Scope budget tidak dapat diubah melalui edit.'
const readOnlySlotProps = { input: { readOnly: true }, inputLabel: { shrink: true } }
const readOnlySx = { '& .MuiInputBase-root': { bgcolor: 'rgba(24, 43, 88, 0.04)' } }

function mapBudgetToFormValues(budget) {
  return {
    budget_code: String(getFirstValue(budget, ['budget_code'])),
    project_name: String(getFirstValue(budget, ['project_name'])),
    budget_type_id: getFirstValue(budget, ['budget_type_id']),
    period_year: getFirstValue(budget, ['period_year'], currentYear),
    period_month: getFirstValue(budget, ['period_month'], currentMonth),
  }
}

function makeBudgetTypeOption(budget) {
  const value = getFirstValue(budget, ['budget_type_id'])
  const label = joinLabel(
    getFirstValue(budget, ['budget_type_code']),
    getFirstValue(budget, ['budget_type_name']),
  )

  return { value, label: label || String(value) }
}

function appendMissingOption(options, option) {
  if (!option?.value || findOption(options, option.value)) {
    return options
  }

  return [...options, option]
}

function EditBudgetForm({ eyebrow, title, budget, onClose, onUpdated }) {
  const [formValues, setFormValues] = useState(() => mapBudgetToFormValues(budget))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [budgetTypeOptions, setBudgetTypeOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState('')

  // Company, department, dan class dikunci oleh backend saat edit, jadi cukup ditampilkan dari snapshot.
  const companyLabel = joinLabel(budget?.company_code_snapshot, budget?.company_name_snapshot)
  const departmentLabel = joinLabel(budget?.department_code_snapshot, budget?.department_name_snapshot)
  const classLabel = joinLabel(budget?.class_code_snapshot, budget?.class_name_snapshot)

  const updateValue = (fieldName, value) => {
    setFormValues((currentValues) => ({ ...currentValues, [fieldName]: value }))
    setFieldErrors((currentErrors) =>
      currentErrors[fieldName] ? { ...currentErrors, [fieldName]: '' } : currentErrors,
    )
  }

  useEffect(() => {
    const controller = new AbortController()

    loadActiveBudgetTypeOptions(controller.signal)
      .then((options) => {
        // Budget type yang sudah nonaktif tetap ditampilkan agar nilai lama tidak hilang.
        setBudgetTypeOptions(appendMissingOption(options, makeBudgetTypeOption(budget)))
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setBudgetTypeOptions(appendMissingOption([], makeBudgetTypeOption(budget)))
          setOptionsError(error.message || 'Gagal memuat budget type.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsOptionsLoading(false)
        }
      })

    return () => controller.abort()
  }, [budget])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting || isOptionsLoading) {
      return
    }

    const normalizedBudgetCode = formValues.budget_code.trim().toUpperCase()
    const normalizedProjectName = formValues.project_name.trim()
    const budgetId = budget?.id
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

    if (!formValues.budget_type_id) {
      nextFieldErrors.budget_type_id = 'Budget type wajib dipilih.'
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
      const response = await api.budgets.update(budgetId, {
        budget_code: normalizedBudgetCode,
        project_name: normalizedProjectName,
        budget_type_id: formValues.budget_type_id,
        period_year: Number(formValues.period_year),
        period_month: Number(formValues.period_month),
        // Scope dikirim apa adanya; perubahan nominal dilakukan lewat dialog terpisah.
        company_id: budget.company_id,
        company_code_snapshot: budget.company_code_snapshot ?? '',
        company_name_snapshot: budget.company_name_snapshot ?? '',
        department_id: budget.department_id,
        department_name_snapshot: budget.department_name_snapshot ?? '',
        department_class_snapshot: budget.department_class_snapshot ?? '',
        department_code_snapshot: budget.department_code_snapshot ?? '',
        class_department_id: budget.class_department_id,
        class_name_snapshot: budget.class_name_snapshot ?? '',
        class_class_snapshot: budget.class_class_snapshot ?? '',
        class_code_snapshot: budget.class_code_snapshot ?? '',
        // Saldo tidak dikirim: backend selalu memakai saldo terbaru dari DB. Mengirim saldo dari
        // baris tabel yang sudah basi membuat edit gagal secara acak.
      })

      await onUpdated?.(response)
      onClose?.()
    } catch (error) {
      const errors = error?.data?.errors

      if (errors) {
        setFieldErrors({
          budget_code: errors.budget_code || '',
          project_name: errors.project_name || '',
          budget_type_id: errors.budget_type_id || '',
          period_year: errors.period_year || '',
          period_month: errors.period_month || '',
        })
      }

      setSubmitError(error.message || 'Gagal memperbarui budget.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <BudgetFormDialog
      eyebrow={eyebrow}
      title={title}
      onClose={onClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={isOptionsLoading}
      submitLabel={isOptionsLoading ? 'Loading...' : 'Simpan'}
      submittingLabel="Saving..."
      errors={[optionsError, submitError]}
    >
      <BudgetFieldGrid>
        <BudgetTextField
          required
          label="Budget Code"
          placeholder="Input budget code"
          value={formValues.budget_code}
          disabled={isSubmitting}
          error={fieldErrors.budget_code}
          onChange={(event) => updateValue('budget_code', event.target.value)}
        />
        <BudgetTextField
          required
          label="Project Name"
          placeholder="Input project name"
          value={formValues.project_name}
          disabled={isSubmitting}
          error={fieldErrors.project_name}
          onChange={(event) => updateValue('project_name', event.target.value)}
        />

        <BudgetFieldFull>
          <BudgetTextField
            label="Company"
            value={companyLabel || '-'}
            helperText={scopeHelperText}
            slotProps={readOnlySlotProps}
            sx={readOnlySx}
          />
        </BudgetFieldFull>
        <BudgetTextField
          label="Department"
          value={departmentLabel || '-'}
          slotProps={readOnlySlotProps}
          sx={readOnlySx}
        />
        <BudgetTextField
          label="Class"
          value={classLabel || '-'}
          slotProps={readOnlySlotProps}
          sx={readOnlySx}
        />

        <BudgetFieldFull>
          <BudgetSelectField
            required
            label="Budget Type"
            placeholder="Pilih budget type"
            loadingText="Memuat budget type..."
            noOptionsText="Budget type aktif tidak ditemukan."
            value={formValues.budget_type_id}
            options={budgetTypeOptions}
            loading={isOptionsLoading}
            disabled={isSubmitting || isOptionsLoading}
            error={fieldErrors.budget_type_id}
            onChange={(value) => updateValue('budget_type_id', value)}
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

  // Form dirender ulang setiap kali dialog dibuka, sehingga state selalu sesuai data budget.
  if (!isOpen || !resolvedBudget) {
    return null
  }

  return (
    <EditBudgetForm
      eyebrow={eyebrow}
      title={title}
      budget={resolvedBudget}
      onClose={onClose}
      onUpdated={onUpdated}
    />
  )
}

export default DialogEditBudgets
