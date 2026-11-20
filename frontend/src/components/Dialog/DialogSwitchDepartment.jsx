import { useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material'
import { ChevronDown, XClose } from '../layoute/TemplateIcons.jsx'

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
function OrganizationAccordion({ id, label, placeholder, options, value, disabled, expanded, onToggle, onChange }) {
  const selectedLabel = options.find((option) => option.id === value)?.label

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={(_, isExpanded) => onToggle(isExpanded)}
      disabled={disabled}
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={{
        border: `1px solid ${expanded ? papertrailHeaderColor : fieldBorderColor}`,
        borderRadius: '8px !important',
        overflow: 'hidden',
        '&::before': { display: 'none' },
        '&.Mui-disabled': { bgcolor: 'background.paper' },
      }}
    >
      <AccordionSummary
        id={`${id}-header`}
        aria-controls={`${id}-content`}
        expandIcon={<ChevronDown size={16} />}
        sx={{
          minHeight: 52,
          px: 1.75,
          bgcolor: expanded ? '#f7f9fc' : 'background.paper',
          '& .MuiAccordionSummary-content': { my: 1, minWidth: 0, flexDirection: 'column', gap: 0.25 },
          '& .MuiAccordionSummary-expandIconWrapper': { color: papertrailHeaderColor },
        }}
      >
        <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', lineHeight: 1.4 }}>
          {label}
        </Typography>
        <Typography
          component="span"
          sx={{
            fontSize: '0.875rem',
            fontWeight: selectedLabel ? 600 : 400,
            color: selectedLabel ? 'text.primary' : 'text.secondary',
            lineHeight: 1.5,
            overflowWrap: 'anywhere',
          }}
        >
          {selectedLabel ?? placeholder}
        </Typography>
      </AccordionSummary>
      <AccordionDetails id={`${id}-content`} sx={{ p: 0, borderTop: '1px solid #e2e8f0' }}>
        <RadioGroup
          aria-labelledby={`${id}-header`}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          sx={{ maxHeight: 'min(240px, 40dvh)', overflowY: 'auto', flexWrap: 'nowrap', py: 0.5 }}
        >
          {options.map(({ id: optionId, label: optionLabel }) => (
            <FormControlLabel
              key={optionId}
              value={optionId}
              disabled={disabled}
              control={<Radio size="small" sx={{ color: fieldBorderColor, '&.Mui-checked': { color: papertrailHeaderColor } }} />}
              label={optionLabel}
              sx={{
                m: 0,
                px: 1,
                py: 0.25,
                alignItems: 'center',
                bgcolor: optionId === value ? 'rgba(52, 73, 104, 0.06)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(52, 73, 104, 0.04)' },
                '& .MuiFormControlLabel-label': { fontSize: '0.875rem', lineHeight: 1.5, overflowWrap: 'anywhere' },
              }}
            />
          ))}
        </RadioGroup>
      </AccordionDetails>
    </Accordion>
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
  const [expandedSection, setExpandedSection] = useState(companyOptions.length > 1 ? 'company' : 'department')
  const toggleSection = (section) => (isExpanded) => setExpandedSection(isExpanded ? section : '')
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
        <DialogContent sx={{ display: 'grid', alignContent: 'start', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1.5, px: sectionPadding, py: 3 }}>
          {companyOptions.length > 1 ? (
            <OrganizationAccordion
              id="switch-department-company"
              label="Perusahaan"
              placeholder="Pilih perusahaan"
              options={companyOptions}
              value={companyId}
              disabled={isSwitching}
              expanded={expandedSection === 'company'}
              onToggle={toggleSection('company')}
              onChange={setCompanyId}
            />
          ) : null}
          {departmentOptions.length > 1 ? (
            <OrganizationAccordion
              id="switch-department-department"
              label="Departemen"
              placeholder="Pilih departemen"
              options={departmentOptions}
              value={departmentId}
              disabled={isSwitching}
              expanded={expandedSection === 'department'}
              onToggle={toggleSection('department')}
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
