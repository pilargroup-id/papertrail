import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
} from '@mui/material'
import { XClose } from '../layoute/TemplateIcons.jsx'

const papertrailHeaderColor = '#344968'
const sectionPadding = { xs: 2, sm: 3 }
const fieldBorderColor = '#cbd5e1'
const actionButtonSx = {
  minHeight: 42,
  px: 2,
  borderRadius: '8px',
  fontWeight: 600,
  textTransform: 'none',
}
const organizationMenuProps = {
  slotProps: {
    paper: {
      sx: {
        mt: 0.5,
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        maxHeight: 'min(280px, calc(100dvh - 32px))',
        '& .MuiMenuItem-root': {
          py: 1,
          fontSize: '0.875rem',
          lineHeight: 1.5,
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
        },
      },
    },
  },
}

function OrganizationSelect({ id, label, placeholder, options, value, disabled, onChange }) {
  const labelId = `${id}-label`

  return (
    <FormControl fullWidth disabled={disabled} sx={{ gap: 0.75 }}>
      <FormLabel
        component="span"
        id={labelId}
        sx={{ color: 'text.primary', fontSize: '0.875rem', fontWeight: 600, '&.Mui-focused': { color: papertrailHeaderColor } }}
      >
        {label}
      </FormLabel>
      <Select
        id={id}
        labelId={labelId}
        size="small"
        value={value}
        displayEmpty
        onChange={(event) => onChange(event.target.value)}
        renderValue={(selectedId) => options.find((option) => option.id === selectedId)?.label ?? (
          <Box component="span" sx={{ color: 'text.secondary' }}>{placeholder}</Box>
        )}
        MenuProps={organizationMenuProps}
        sx={{
          minHeight: 44,
          borderRadius: '8px',
          fontSize: '0.875rem',
          '& .MuiSelect-select[role="combobox"]': {
            py: 1.25,
            lineHeight: 1.5,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
          },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: fieldBorderColor },
          '&:hover .MuiOutlinedInput-notchedOutline, &.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: papertrailHeaderColor,
          },
        }}
      >
        {options.map(({ id: optionId, label: optionLabel }) => (
          <MenuItem key={optionId} value={optionId}>{optionLabel}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function getInitialSelection(options, activeId) {
  const id = String(activeId ?? '')
  return options.length > 1 && options.some((option) => option.id === id) ? id : ''
}

function DialogSwitchDepartment({ departmentOptions, companyOptions, activeDepartmentId, activeCompanyId, onClose, onSwitch }) {
  const initialDepartmentId = getInitialSelection(departmentOptions, activeDepartmentId)
  const initialCompanyId = getInitialSelection(companyOptions, activeCompanyId)
  const [departmentId, setDepartmentId] = useState(initialDepartmentId)
  const [companyId, setCompanyId] = useState(initialCompanyId)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState('')
  const hasChanges = departmentId !== initialDepartmentId || companyId !== initialCompanyId

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!hasChanges || isSwitching) return

    setIsSwitching(true)
    setError('')
    try {
      await onSwitch({ departmentId, companyId })
      onClose()
    } catch {
      setError('Gagal mengganti departemen atau perusahaan. Coba lagi.')
      setIsSwitching(false)
    }
  }

  return (
    <Dialog
      open
      onClose={isSwitching ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="switch-department-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            m: { xs: 2, sm: 4 },
            width: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
            maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
          },
        },
      }}
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 2,
            px: sectionPadding,
            py: 1.5,
            bgcolor: papertrailHeaderColor,
            color: '#fff',
          }}
        >
          <DialogTitle id="switch-department-title" sx={{ p: 0, fontSize: '1.0625rem', fontWeight: 700, lineHeight: 1.3 }}>
            Switch Department
          </DialogTitle>
          <IconButton
            aria-label="Tutup dialog"
            onClick={onClose}
            disabled={isSwitching}
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '5px',
              color: 'inherit',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
              '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.4)' },
            }}
          >
            <XClose size={20} />
          </IconButton>
        </Box>
        <DialogContent sx={{ display: 'grid', alignContent: 'start', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2, px: sectionPadding, py: 3 }}>
          {companyOptions.length > 1 ? (
            <OrganizationSelect
              id="switch-department-company"
              label="Perusahaan"
              placeholder="Pilih perusahaan"
              options={companyOptions}
              value={companyId}
              disabled={isSwitching}
              onChange={setCompanyId}
            />
          ) : null}
          {departmentOptions.length > 1 ? (
            <OrganizationSelect
              id="switch-department-department"
              label="Departemen"
              placeholder="Pilih departemen"
              options={departmentOptions}
              value={departmentId}
              disabled={isSwitching}
              onChange={setDepartmentId}
            />
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </DialogContent>
        <DialogActions
          disableSpacing
          sx={{
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1,
            px: sectionPadding,
            py: 2,
            borderTop: '1px solid #e2e8f0',
            bgcolor: '#f7f9fc',
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={isSwitching}
            sx={{
              ...actionButtonSx,
              bgcolor: 'background.paper',
              color: papertrailHeaderColor,
              borderColor: fieldBorderColor,
              '&:hover': { borderColor: papertrailHeaderColor },
            }}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={!hasChanges || isSwitching}
            sx={{
              ...actionButtonSx,
              minWidth: { xs: 0, sm: 104 },
              bgcolor: papertrailHeaderColor,
              '&:hover': { bgcolor: 'var(--primary-blue, #1a2a57)' },
            }}
          >
            {isSwitching ? 'Menerapkan…' : 'Terapkan'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default DialogSwitchDepartment
