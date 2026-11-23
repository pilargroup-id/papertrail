import { useId } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
} from '@mui/material'

import {
  autocompleteSlotProps,
  autocompleteSlots,
} from '../dialog-frp/tabs-create-frp/autocompleteStyles.js'
import { findOption } from './budgetFormUtils.js'

const fieldSx = {
  '& .MuiFormHelperText-root': { mx: 0.25, overflowWrap: 'anywhere' },
}

export function BudgetTextField({ error, helperText, sx, ...props }) {
  return (
    <TextField
      fullWidth
      size="small"
      error={Boolean(error)}
      helperText={error || helperText}
      sx={[fieldSx, ...(Array.isArray(sx) ? sx : [sx])]}
      {...props}
    />
  )
}

export function BudgetSelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  loading = false,
  loadingText = 'Memuat...',
  noOptionsText = 'Data tidak ditemukan.',
  required = false,
  disabled = false,
  disableClearable = false,
  error,
  helperText,
}) {
  return (
    <Autocomplete
      fullWidth
      size="small"
      autoHighlight
      options={options}
      value={findOption(options, value)}
      getOptionLabel={(option) => option?.label ?? ''}
      getOptionKey={(option) => String(option.value)}
      isOptionEqualToValue={(option, selected) => String(option.value) === String(selected?.value)}
      onChange={(_, option) => onChange(option?.value ?? '')}
      loading={loading}
      loadingText={loadingText}
      noOptionsText={noOptionsText}
      disabled={disabled}
      disableClearable={disableClearable}
      slots={autocompleteSlots}
      slotProps={autocompleteSlotProps}
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          label={label}
          placeholder={loading ? loadingText : placeholder}
          error={Boolean(error)}
          helperText={error || helperText}
          sx={fieldSx}
        />
      )}
    />
  )
}

export function BudgetFieldGrid({ children }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        columnGap: 2,
        rowGap: { xs: 2, sm: 2.25 },
        alignItems: 'start',
      }}
    >
      {children}
    </Box>
  )
}

export function BudgetFieldFull({ children }) {
  return <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>{children}</Box>
}

export function BudgetFormDialog({
  eyebrow,
  title,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitDisabled = false,
  submitLabel,
  submittingLabel,
  errors = [],
  children,
}) {
  const titleId = useId()
  const visibleErrors = errors.filter(Boolean)

  const handleClose = () => {
    if (!isSubmitting) {
      onClose?.()
    }
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
          onSubmit,
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
        <div>
          {eyebrow ? <p className="dashboard-popup__eyebrow">{eyebrow}</p> : null}
          <h2 className="dashboard-popup__title" id={titleId}>
            {title}
          </h2>
        </div>
      </div>

      <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, pt: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.5 } }}>
        {/* Spacer so the first floating label is not clipped by DialogContent's overflow. */}
        <Box sx={{ pt: 0.75 }}>{children}</Box>

        {visibleErrors.length > 0 ? (
          <Box sx={{ display: 'grid', gap: 1, mt: 2 }}>
            {visibleErrors.map((message) => (
              <Alert key={message} severity="error">
                {message}
              </Alert>
            ))}
          </Box>
        ) : null}
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
          disabled={submitDisabled || isSubmitting}
          sx={{
            '&:not(.Mui-disabled)': {
              bgcolor: 'var(--accent-teal-dark)',
              backgroundImage: 'linear-gradient(135deg, var(--accent-teal), var(--accent-teal-dark))',
              '&:hover': { backgroundImage: 'none' },
            },
          }}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
