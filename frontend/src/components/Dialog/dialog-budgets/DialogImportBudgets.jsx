import { useId, useRef, useState } from 'react'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'

import api from '../../../services/api.js'

const DATA_EXCHANGE_GROUP = 'budget'
const DATA_EXCHANGE_OPTIONS = { sheet: 'Budgets' }
const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_VISIBLE_ERRORS = 8

const modeOptions = [
  {
    value: 'INSERT_ONLY',
    label: 'Tambah baru',
    hint: 'Import dibatalkan bila ada data yang sudah terdaftar.',
  },
  {
    value: 'SKIP_DUPLICATES',
    label: 'Lewati duplikat',
    hint: 'Data yang sudah terdaftar dilewati, sisanya tetap diimport.',
  },
]

const sheetLabels = {
  Budgets: 'Budget',
  BudgetTypes: 'Budget Type',
  BudgetAccessRules: 'Budget Access Rule',
}

const outlinedButtonSx = {
  bgcolor: 'common.white',
  color: 'var(--primary-blue)',
  borderColor: 'rgba(26, 42, 87, 0.14)',
  '&:hover': {
    bgcolor: 'rgba(24, 43, 88, 0.04)',
    borderColor: 'rgba(26, 42, 87, 0.22)',
  },
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileError(file) {
  if (!/\.xlsx$/i.test(file?.name ?? '')) {
    return 'Format file harus .xlsx.'
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'Ukuran file maksimal 8 MB.'
  }

  return ''
}

function getResponsePayload(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function SectionLabel({ children }) {
  return (
    <Typography variant="caption" component="div" color="text.secondary" sx={{ mb: 0.75, fontWeight: 600 }}>
      {children}
    </Typography>
  )
}

function ValidationReport({ report, errors }) {
  const hiddenErrorCount = Math.max(0, errors.length - MAX_VISIBLE_ERRORS)

  return (
    <Stack spacing={1.5}>
      {report.length > 0 && (
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            fontVariantNumeric: 'tabular-nums',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            '& th, & td': { px: 1.5, py: 0.875, textAlign: 'end' },
            '& tr > :first-of-type': { textAlign: 'start' },
            '& thead th': { bgcolor: '#f5f8fc', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 },
            '& tbody th, & tbody td': { borderTop: '1px solid', borderColor: 'divider' },
            '& tbody th': { fontWeight: 600 },
          }}
        >
          <thead>
            <tr>
              <th scope="col">Sheet</th>
              <th scope="col">Total</th>
              <th scope="col">Baru</th>
              <th scope="col">Dilewati</th>
            </tr>
          </thead>
          <tbody>
            {report.map((item) => (
              <tr key={item.sheet}>
                <th scope="row">{sheetLabels[item.sheet] ?? item.sheet}</th>
                <td>{item.total}</td>
                <td>{item.insert}</td>
                <td>{item.skip}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      )}

      {errors.length > 0 ? (
        <Alert severity="error">
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Ditemukan {errors.length} masalah. Perbaiki file lalu validasi ulang.
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.25, '& li': { overflowWrap: 'anywhere' } }}>
            {errors.slice(0, MAX_VISIBLE_ERRORS).map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </Box>
          {hiddenErrorCount > 0 && (
            <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
              dan {hiddenErrorCount} masalah lainnya.
            </Typography>
          )}
        </Alert>
      ) : (
        <Alert severity="success">File valid dan siap diimport.</Alert>
      )}
    </Stack>
  )
}

function DialogImportBudgets({ onClose, onImported }) {
  const titleId = useId()
  const inputRef = useRef(null)
  const busy = useRef(false)
  const [mode, setMode] = useState(modeOptions[0].value)
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [validation, setValidation] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [status, setStatus] = useState('idle') // idle | template | validating | importing

  const isBusy = status !== 'idle'
  const isValid = Boolean(validation?.valid)
  const activeMode = modeOptions.find((option) => option.value === mode)

  const resetResult = () => {
    setValidation(null)
    setSubmitError('')
  }

  const selectFile = (nextFile) => {
    if (!nextFile) {
      return
    }

    resetResult()
    const error = getFileError(nextFile)
    setFileError(error)
    setFile(error ? null : nextFile)
  }

  const clearFile = () => {
    resetResult()
    setFile(null)
    setFileError('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleClose = () => {
    if (!busy.current) {
      onClose()
    }
  }

  const runTask = async (nextStatus, task) => {
    if (busy.current) {
      return
    }

    busy.current = true
    setStatus(nextStatus)
    setSubmitError('')
    try {
      await task()
    } catch (error) {
      setSubmitError(error.message || 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      busy.current = false
      setStatus('idle')
    }
  }

  const handleDownloadTemplate = () =>
    runTask('template', async () => {
      const blob = await api.dataExchange.template(DATA_EXCHANGE_GROUP, DATA_EXCHANGE_OPTIONS)
      downloadBlob(blob, 'budget-template.xlsx')
    })

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!file) {
      setFileError('Pilih file .xlsx terlebih dahulu.')
      return
    }

    if (!isValid) {
      runTask('validating', async () => {
        const response = await api.dataExchange.validate(DATA_EXCHANGE_GROUP, file, mode, DATA_EXCHANGE_OPTIONS)
        const payload = getResponsePayload(response)
        setValidation({
          valid: Boolean(payload.valid),
          report: Array.isArray(payload.report) ? payload.report : [],
          errors: Array.isArray(payload.errors) ? payload.errors : [],
        })
      })
      return
    }

    runTask('importing', async () => {
      const response = await api.dataExchange.import(DATA_EXCHANGE_GROUP, file, mode, DATA_EXCHANGE_OPTIONS)
      const payload = getResponsePayload(response)
      onImported?.({
        applied: Number(payload.applied) || 0,
        skipped: Number(payload.skipped) || 0,
      })
    })
  }

  const primaryLabel = {
    validating: 'Memvalidasi…',
    importing: 'Mengimport…',
  }[status] ?? (isValid ? 'Import' : 'Validasi File')

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
        <h2 className="dashboard-popup__title" id={titleId}>Import Budget</h2>
      </div>

      <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={{ xs: 2, sm: 2.25 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1.5,
              p: 1.75,
              bgcolor: '#f5f8fc',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ color: 'var(--primary-blue)', fontWeight: 700 }}>
                Gunakan template Excel
              </Typography>
              <Typography variant="caption" component="p" color="text.secondary">
                Isi sheet <strong>Budgets</strong> pakai ID dari sheet <strong>Referensi</strong>. Nama
                company/department terisi otomatis. Budget yang sudah ada tidak bisa diubah lewat import.
              </Typography>
            </Box>
            <Button
              type="button"
              size="small"
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              onClick={handleDownloadTemplate}
              disabled={isBusy}
              sx={{ ...outlinedButtonSx, flexShrink: 0, minHeight: 36, textTransform: 'none', fontWeight: 600 }}
            >
              {status === 'template' ? 'Mengunduh…' : 'Download Template'}
            </Button>
          </Box>

          <Box>
            <SectionLabel>Mode import</SectionLabel>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={mode}
              disabled={isBusy}
              aria-label="Mode import"
              onChange={(_, value) => {
                if (value) {
                  setMode(value)
                  resetResult()
                }
              }}
            >
              {modeOptions.map(({ value, label }) => (
                <ToggleButton
                  key={value}
                  value={value}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    '&.Mui-selected, &.Mui-selected:hover': {
                      color: 'var(--accent-teal-dark)',
                      bgcolor: 'rgba(42, 157, 143, 0.08)',
                      borderColor: 'var(--accent-teal)',
                    },
                  }}
                >
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 0.75 }}>
              {activeMode?.hint}
            </Typography>
          </Box>

          <Box>
            <SectionLabel>File</SectionLabel>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />

            {file ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <InsertDriveFileOutlinedIcon sx={{ color: 'var(--accent-teal-dark)' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }} title={file.name}>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>
                <IconButton size="small" aria-label="Hapus file" onClick={clearFile} disabled={isBusy}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Box
                component="button"
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  selectFile(event.dataTransfer.files?.[0])
                }}
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 2,
                  py: 3,
                  font: 'inherit',
                  color: 'text.secondary',
                  cursor: 'pointer',
                  bgcolor: isDragging ? 'rgba(42, 157, 143, 0.06)' : 'transparent',
                  border: '1.5px dashed',
                  borderColor: fileError ? 'error.main' : isDragging ? 'var(--accent-teal)' : 'rgba(26, 42, 87, 0.2)',
                  borderRadius: 2,
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                  '&:hover, &:focus-visible': { borderColor: 'var(--accent-teal)', outline: 'none' },
                }}
              >
                <UploadFileRoundedIcon sx={{ fontSize: 32, color: 'var(--accent-teal)' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--primary-blue)' }}>
                  Klik atau tarik file ke sini
                </Typography>
                <Typography variant="caption">Format .xlsx, maksimal 8 MB</Typography>
              </Box>
            )}

            {fileError && (
              <Typography variant="caption" component="p" color="error" sx={{ mt: 0.75 }}>
                {fileError}
              </Typography>
            )}
          </Box>

          {validation && <ValidationReport report={validation.report} errors={validation.errors} />}
          {submitError && <Alert severity="error">{submitError}</Alert>}
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
        <Button type="button" variant="outlined" onClick={handleClose} disabled={isBusy} sx={outlinedButtonSx}>
          Batal
        </Button>
        <Button
          type="submit"
          variant="contained"
          disableElevation
          disabled={isBusy || !file}
          sx={{
            '&:not(.Mui-disabled)': {
              bgcolor: 'var(--accent-teal-dark)',
              backgroundImage: 'linear-gradient(135deg, var(--accent-teal), var(--accent-teal-dark))',
              '&:hover': { backgroundImage: 'none' },
            },
          }}
        >
          {primaryLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogImportBudgets
