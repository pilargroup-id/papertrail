import { useEffect, useId, useRef, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'

import api from '../../../services/api.js'
import {
  budgetLabel,
  formatBalance,
  minimumBudgetMovementCents,
  parseBudgetAmount,
  rupiah,
  rupiahDigits,
  toCents,
} from './budgetFormUtils.js'

const OPERATION_INCREASE = 'INCREASE'
const OPERATION_DECREASE = 'DECREASE'
const minimumAdjustmentText = `Minimum adjustment ${rupiah.format(minimumBudgetMovementCents / 100)}.`
const insufficientBalanceText = 'Pengurangan melebihi sisa budget (remaining).'

const operationOptions = [
  {
    value: OPERATION_INCREASE,
    label: 'Penambahan',
    icon: AddRoundedIcon,
    color: '#14675e',
    background: 'rgba(20, 103, 94, 0.08)',
  },
  {
    value: OPERATION_DECREASE,
    label: 'Pengurangan',
    icon: RemoveRoundedIcon,
    color: '#b42318',
    background: 'rgba(180, 35, 24, 0.08)',
  },
]

function AdjustmentPreview({ amountCents, remainingCents, deltaCents }) {
  const previewId = useId()
  const hasDelta = deltaCents !== null
  const rows = [
    {
      label: 'Amount',
      before: amountCents,
      after: hasDelta && amountCents !== null ? amountCents + deltaCents : null,
    },
    {
      label: 'Remaining',
      before: remainingCents,
      after: hasDelta && remainingCents !== null ? remainingCents + deltaCents : null,
    },
  ]
  const afterColor = deltaCents !== null && deltaCents < 0 ? '#b42318' : '#14675e'

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
          '& tbody td:last-of-type': { color: afterColor, fontWeight: 700 },
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
      <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 1 }}>
        Reserved dan used tidak berubah oleh adjustment.
      </Typography>
    </Box>
  )
}

function DialogAdjustBudget({ budget: initialBudget, onClose, onAdjusted }) {
  const titleId = useId()
  const submitting = useRef(false)
  // Baris tabel bisa basi (FRP/RP, transfer, atau user lain mengubah saldo); ambil saldo terbaru.
  const [budget, setBudget] = useState(initialBudget)

  useEffect(() => {
    const controller = new AbortController()

    api.budgets.detail(initialBudget.id, undefined, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted && response?.data?.id !== undefined) {
          setBudget(response.data)
        }
      })
      .catch(() => {
        // Tetap pakai data baris tabel; backend tetap memvalidasi saldo saat submit.
      })

    return () => controller.abort()
  }, [initialBudget.id])
  const [operation, setOperation] = useState(OPERATION_INCREASE)
  const [amountInput, setAmountInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const amount = parseBudgetAmount(amountInput)
  const amountCents = toCents(budget?.budget_amount)
  const remainingCents = toCents(budget?.budget_remaining)
  const isDecrease = operation === OPERATION_DECREASE
  const exceedsBalance = isDecrease && amount !== null && remainingCents !== null && amount.cents > remainingCents
  const amountError = fieldErrors.amount || (exceedsBalance ? insufficientBalanceText : '')
  const canPreview = amount && amount.cents >= minimumBudgetMovementCents && !exceedsBalance
  const deltaCents = canPreview ? (isDecrease ? -amount.cents : amount.cents) : null

  const handleClose = () => {
    if (!submitting.current) {
      onClose()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting.current) {
      return
    }

    const reason = reasonInput.trim()
    const errors = {}

    if (!amountInput.trim()) {
      errors.amount = 'Isi nominal adjustment.'
    } else if (amount === null) {
      errors.amount = `Masukkan nominal rupiah dengan maksimal dua angka desimal, misalnya ${rupiah.format(1000.5)}.`
    } else if (amount.cents < minimumBudgetMovementCents) {
      errors.amount = minimumAdjustmentText
    } else if (exceedsBalance) {
      errors.amount = insufficientBalanceText
    }
    if (!reason) {
      errors.reason = 'Isi alasan adjustment.'
    }

    setFieldErrors(errors)
    setSubmitError(null)
    if (Object.keys(errors).length > 0) {
      return
    }

    submitting.current = true
    setIsSubmitting(true)
    try {
      await api.budgets.adjust(budget.id, {
        operation,
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
          : error.message || 'Gagal melakukan adjustment budget.',
      })
      return
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }

    onAdjusted?.({ operation, amount: amount.value })
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
        <h2 className="dashboard-popup__title" id={titleId}>Adjustment Budget</h2>
      </div>
      <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <Box sx={{ px: 1.75, py: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" component="div" color="text.secondary">Budget</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
              {budgetLabel(budget)}
            </Typography>
            <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 0.5 }}>
              Remaining: {formatBalance(remainingCents)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" component="div" color="text.secondary" sx={{ mb: 0.75 }}>
              Jenis adjustment
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={operation}
              disabled={isSubmitting}
              aria-label="Jenis adjustment"
              onChange={(_, value) => {
                if (value) {
                  setOperation(value)
                  setFieldErrors((current) => ({ ...current, amount: '' }))
                }
              }}
            >
              {operationOptions.map(({ value, label, icon: Icon, color, background }) => (
                <ToggleButton
                  key={value}
                  value={value}
                  sx={{
                    gap: 0.75,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&.Mui-selected, &.Mui-selected:hover': { color, bgcolor: background, borderColor: color },
                  }}
                >
                  <Icon fontSize="small" />
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <TextField
            required
            size="small"
            label={isDecrease ? 'Nominal pengurangan' : 'Nominal penambahan'}
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
            helperText={amountError || (isDecrease
              ? `Maksimal ${formatBalance(remainingCents)} (sisa budget).`
              : minimumAdjustmentText)}
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
            label="Alasan adjustment"
            value={reasonInput}
            onChange={(event) => {
              setReasonInput(event.target.value)
              setFieldErrors((current) => ({ ...current, reason: '' }))
            }}
            error={Boolean(fieldErrors.reason)}
            helperText={fieldErrors.reason || `${reasonInput.length}/1000`}
            disabled={isSubmitting}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <AdjustmentPreview amountCents={amountCents} remainingCents={remainingCents} deltaCents={deltaCents} />
        </Stack>
      </DialogContent>
      {/* Di luar DialogContent agar error selalu terlihat, tidak tersembunyi di bawah area scroll. */}
      {submitError && (
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
          <Alert severity={submitError.severity}>{submitError.message}</Alert>
        </Box>
      )}
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
          disabled={isSubmitting}
          sx={{
            '&:not(.Mui-disabled)': {
              bgcolor: 'var(--accent-teal-dark)',
              backgroundImage: 'linear-gradient(135deg, var(--accent-teal), var(--accent-teal-dark))',
              '&:hover': { backgroundImage: 'none' },
            },
          }}
        >
          {isSubmitting ? 'Menyimpan…' : 'Simpan Adjustment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogAdjustBudget
