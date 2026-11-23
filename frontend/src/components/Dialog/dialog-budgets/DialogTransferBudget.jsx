import { useEffect, useId, useRef, useState } from 'react'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  createFilterOptions,
  Dialog,
  DialogActions,
  DialogContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import api from '../../../services/api.js'
import ZoomAwarePopper from '../dialog-frp/tabs-create-frp/ZoomAwarePopper.jsx'
import {
  budgetLabel,
  formatBalance,
  minimumBudgetMovementCents,
  parseBudgetAmount,
  rupiah,
  rupiahDigits,
} from './budgetFormUtils.js'

const contextKeys = ['company_id', 'department_id', 'class_department_id']
const minimumTransferText = `Minimum transfer ${rupiah.format(minimumBudgetMovementCents / 100)}.`
const insufficientBalanceText = 'Nominal melebihi sisa budget sumber.'

const filterDestinations = createFilterOptions({ stringify: budgetLabel })
const destinationPopperProps = {
  placement: 'bottom-start',
  modifiers: [
    { name: 'offset', options: { offset: [0, 4] } },
    { name: 'flip', options: { fallbackPlacements: ['top-start'] } },
  ],
  style: { minWidth: 0 },
}

function BudgetPreview({ sourceBalanceCents, destinationBalanceCents, transferCents }) {
  const previewId = useId()
  const rows = [
    {
      label: 'Sumber',
      before: sourceBalanceCents,
      after: transferCents === null ? null : sourceBalanceCents - transferCents,
    },
    {
      label: 'Tujuan',
      before: destinationBalanceCents,
      after: transferCents === null ? null : destinationBalanceCents + transferCents,
    },
  ]

  return (
    <Box
      component="section"
      aria-labelledby={previewId}
      sx={{ p: 1.75, bgcolor: '#f5f8fc', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <Typography id={previewId} component="h3" variant="subtitle2" sx={{ color: 'var(--primary-blue)', fontWeight: 700 }}>
        Preview Budget
      </Typography>
      <Box
        component="table"
        sx={{
          width: '100%',
          mt: 0.75,
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
          fontVariantNumeric: 'tabular-nums',
          '& th, & td': { px: 0, py: 0.75, textAlign: 'end', overflowWrap: 'anywhere' },
          '& tr > th:first-of-type': { textAlign: 'start', pr: 1, whiteSpace: 'nowrap' },
          '& th + th, & td': { pl: 1 },
          '& thead th': { fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 },
          '& tbody th, & tbody td': { borderTop: '1px solid', borderColor: 'divider' },
          '& tbody th': { fontWeight: 600 },
          '& tbody td:last-of-type': { color: '#14675e', fontWeight: 700 },
          '@media (max-width: 359px)': { fontSize: '0.75rem' },
        }}
      >
        <thead>
          <tr>
            <th scope="col">Saldo</th>
            <th scope="col">Sebelum</th>
            <th scope="col">Setelah</th>
          </tr>
        </thead>
        <tbody aria-live="polite">
          {rows.map(({ label, before, after }) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{formatBalance(before)}</td>
              <td>{formatBalance(after)}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  )
}

async function loadDestinations(source, signal) {
  const { company_id, department_id, class_department_id } = source
  const destinations = []
  let totalPages = 1

  for (let page = 1; page <= totalPages; page += 1) {
    const response = await api.budgets.list(
      { company_id, department_id, class_department_id, is_active: 1, page, limit: 100 },
      { signal },
    )

    destinations.push(...response.data.filter((budget) => (
      Number(budget.is_active) === 1 &&
      String(budget.id) !== String(source.id) &&
      contextKeys.every((key) => String(budget[key]) === String(source[key]))
    )))
    totalPages = response.meta.totalPages
  }

  return destinations
}

function DialogTransferBudget({ source, onClose, onTransferred }) {
  const titleId = useId()
  const submitting = useRef(false)
  const [destinationResult, setDestinationResult] = useState(null)
  const [destination, setDestination] = useState(null)
  const [amountInput, setAmountInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    loadDestinations(source, controller.signal).then((options) => {
      if (!controller.signal.aborted) {
        setDestinationResult({ options })
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setDestinationResult({ error: error.message || 'Gagal memuat budget tujuan.' })
      }
    })

    return () => controller.abort()
  }, [source])

  const isLoading = destinationResult === null
  const options = destinationResult?.options ?? []
  const noDestinations = !isLoading && options.length === 0 && !destinationResult.error
  const destinationHelper = noDestinations
    ? 'Tidak ada budget tujuan aktif dalam company, department, dan class yang sama.'
    : fieldErrors.destination || destination?.project_name
  const amount = parseBudgetAmount(amountInput)
  const sourceBalanceCents = Math.round(Number(source.budget_remaining) * 100)
  const destinationBalanceCents = destination ? Math.round(Number(destination.budget_remaining) * 100) : null
  const exceedsBalance = amount !== null && amount.cents > sourceBalanceCents
  const amountError = fieldErrors.amount || (exceedsBalance ? insufficientBalanceText : '')
  const canPreview = destination && amount && amount.cents >= minimumBudgetMovementCents && !exceedsBalance

  const handleClose = () => {
    if (!submitting.current) {
      onClose()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting.current || isLoading || options.length === 0) {
      return
    }

    const reason = reasonInput.trim()
    const errors = {}

    if (!destination) {
      errors.destination = 'Pilih budget tujuan.'
    }
    if (!amountInput.trim()) {
      errors.amount = 'Isi nominal transfer.'
    } else if (amount === null) {
      errors.amount = `Masukkan nominal rupiah dengan maksimal dua angka desimal, misalnya ${rupiah.format(1000.5)}.`
    } else if (amount.cents < minimumBudgetMovementCents) {
      errors.amount = minimumTransferText
    } else if (exceedsBalance) {
      errors.amount = insufficientBalanceText
    }
    if (!reason) {
      errors.reason = 'Isi alasan transfer.'
    }

    setFieldErrors(errors)
    setSubmitError(null)
    if (Object.keys(errors).length > 0) {
      return
    }

    submitting.current = true
    setIsSubmitting(true)
    try {
      await api.budgets.transfer({
        source_budget_id: source.id,
        destination_budget_id: destination.id,
        amount: amount.value,
        reason,
      })
    } catch (error) {
      const outcomeUnknown = !error.status || error.status >= 500
      // Jangan kunci form: user tetap bisa memperbaiki input atau mencoba lagi.
      setSubmitError({
        severity: outcomeUnknown ? 'warning' : 'error',
        message: outcomeUnknown
          ? `${error.message || 'Server tidak merespons.'} Periksa History budget sebelum mencoba lagi agar tidak tercatat dua kali.`
          : error.message || 'Gagal mentransfer budget.',
      })
      return
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }

    onTransferred()
  }

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
      onClose={handleClose}
      slotProps={{
        paper: {
          component: 'form',
          noValidate: true,
          onSubmit: handleSubmit,
          sx: {
            width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 64px)' },
            maxHeight: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 64px)' },
            m: { xs: 1.5, sm: 4 },
            borderRadius: { xs: '16px', sm: '24px' },
          },
        },
      }}
    >
      <div className="dashboard-popup__header">
        <h2 className="dashboard-popup__title" id={titleId}>Transfer Budget</h2>
      </div>
      <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <Box sx={{ px: 1.75, py: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" component="div" color="text.secondary">Budget sumber</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
              {budgetLabel(source)}
            </Typography>
          </Box>
          <Autocomplete
            autoHighlight
            size="small"
            options={options}
            value={destination}
            filterOptions={filterDestinations}
            getOptionLabel={(budget) => budget.budget_code}
            getOptionKey={(budget) => budget.id}
            onChange={(_, budget) => {
              setDestination(budget)
              setFieldErrors((current) => ({ ...current, destination: '' }))
            }}
            disabled={isSubmitting || options.length === 0}
            openText="Buka daftar budget tujuan"
            closeText="Tutup daftar budget tujuan"
            clearText="Hapus pilihan budget tujuan"
            noOptionsText="Budget tidak ditemukan."
            slots={{ popper: ZoomAwarePopper }}
            slotProps={{
              popper: destinationPopperProps,
              paper: {
                elevation: 4,
                sx: { zoom: 'var(--app-zoom-scale, 1)', borderRadius: 2, border: '1px solid', borderColor: 'divider' },
              },
              listbox: {
                sx: {
                  maxHeight: 'min(260px, 40vh)',
                  p: 0.5,
                  '& .MuiAutocomplete-option': { gap: 1, px: 1.25, py: 0.75, borderRadius: 1 },
                },
              },
            }}
            renderOption={(props, budget, { selected }) => {
              const { key, ...optionProps } = props

              return (
                <li key={key} {...optionProps}>
                  <Box sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                    <Typography component="div" variant="caption" color="text.secondary">
                      {budget.budget_code}
                    </Typography>
                    <Typography component="div" variant="body2" sx={{ fontWeight: 600 }}>
                      {budget.project_name}
                    </Typography>
                  </Box>
                  {selected && <CheckRoundedIcon fontSize="small" color="primary" />}
                </li>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                label="Budget tujuan"
                placeholder="Cari kode atau nama proyek"
                error={Boolean(fieldErrors.destination)}
                helperText={isLoading ? 'Memuat budget tujuan…' : destinationHelper}
                sx={{ '& .MuiFormHelperText-root': { overflowWrap: 'anywhere' } }}
              />
            )}
          />
          <TextField
            required
            size="small"
            label="Nominal transfer"
            value={amountInput}
            onChange={(event) => {
              setAmountInput(event.target.value)
              setFieldErrors((current) => ({ ...current, amount: '' }))
            }}
            onBlur={() => {
              if (amount) {
                setAmountInput(rupiahDigits.format(amount.value))
              }
            }}
            error={Boolean(amountError)}
            helperText={amountError || minimumTransferText}
            disabled={isSubmitting}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> },
              htmlInput: { inputMode: 'decimal' },
            }}
          />
          <TextField
            required
            size="small"
            multiline
            minRows={2}
            label="Alasan transfer"
            value={reasonInput}
            onChange={(event) => {
              setReasonInput(event.target.value)
              setFieldErrors((current) => ({ ...current, reason: '' }))
            }}
            error={Boolean(fieldErrors.reason)}
            helperText={fieldErrors.reason}
            disabled={isSubmitting}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <BudgetPreview
            sourceBalanceCents={sourceBalanceCents}
            destinationBalanceCents={destinationBalanceCents}
            transferCents={canPreview ? amount.cents : null}
          />
          {destinationResult?.error && <Alert severity="error">{destinationResult.error}</Alert>}
          {submitError && <Alert severity={submitError.severity}>{submitError.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions
        disableSpacing
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          gap: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          '& .MuiButton-root': { minHeight: 40, minWidth: 104, textTransform: 'none' },
        }}
      >
        <Button
          type="button"
          variant="outlined"
          onClick={handleClose}
          disabled={isSubmitting}
          sx={{
            bgcolor: 'common.white',
            color: 'var(--primary-blue)',
            borderColor: 'rgba(26, 42, 87, 0.14)',
            '&:hover': {
              bgcolor: 'rgba(24, 43, 88, 0.04)',
              borderColor: 'rgba(26, 42, 87, 0.22)',
            },
          }}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="contained"
          disableElevation
          disabled={options.length === 0 || isSubmitting}
          sx={{
            '&:not(.Mui-disabled)': {
              bgcolor: 'var(--accent-teal-dark)',
              backgroundImage: 'linear-gradient(135deg, var(--accent-teal), var(--accent-teal-dark))',
              '&:hover': { backgroundImage: 'none' },
            },
          }}
        >
          {isSubmitting ? 'Mentransfer…' : 'Transfer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogTransferBudget
