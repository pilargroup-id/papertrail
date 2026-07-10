import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import Typography from '@mui/material/Typography'

import Dropdown from '../../components/forms/dropdown/Dropdown.jsx'
import DropdownSearch from '../../components/forms/dropdown/DropdownSearch.jsx'
import { XClose } from '../../components/layoute/TemplateIcons.jsx'

const EMPTY_FILTERS = {
  requestBy: '',
  vendor: '',
  date: '',
}

const defaultDateOptions = [
  { value: 'today', label: 'Hari ini' },
  { value: 'last_7_days', label: '7 hari terakhir' },
  { value: 'last_30_days', label: '30 hari terakhir' },
  { value: 'this_month', label: 'Bulan ini' },
]

function DrawerFilterFrp({
  open = false,
  title = 'Filter FRP',
  children,
  value,
  requestByOptions = [],
  vendorOptions = [],
  dateOptions = defaultDateOptions,
  onChange,
  onClose,
  onOpen,
  onReset,
  onApply,
}) {
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    ...value,
  }))

  const currentFilters = value ?? filters

  const updateFilter = (name, nextValue) => {
    const nextFilters = {
      ...currentFilters,
      [name]: nextValue,
    }

    setFilters(nextFilters)
    onChange?.(nextFilters)
  }

  const handleClose = () => {
    onClose?.()
  }

  const handleOpen = () => {
    onOpen?.()
  }

  const handleReset = () => {
    setFilters(EMPTY_FILTERS)
    onChange?.(EMPTY_FILTERS)
    onReset?.(EMPTY_FILTERS)
  }

  const handleApply = () => {
    onApply?.(currentFilters)
    handleClose()
  }

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={handleClose}
      onOpen={handleOpen}
      disableSwipeToOpen={false}
      keepMounted
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxHeight: '82dvh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 2,
            py: 1.5,
          }}
        >
          <Typography component="h2" sx={{ fontWeight: 700, fontSize: 16 }}>
            {title}
          </Typography>

          <Button
            type="button"
            aria-label="Tutup filter"
            onClick={handleClose}
            sx={{
              minWidth: 0,
              width: 36,
              height: 36,
              borderRadius: '999px',
              color: 'var(--primary-blue)',
              bgcolor: 'rgba(26, 42, 87, 0.08)',
              '&:hover': {
                bgcolor: 'rgba(26, 42, 87, 0.14)',
              },
            }}
          >
            <XClose size={18} />
          </Button>
        </Box>

        <Divider />

        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <DropdownSearch
              label="Request by"
              options={requestByOptions}
              value={currentFilters.requestBy}
              placeholder="Pilih requester"
              searchPlaceholder="Cari requester..."
              emptyMessage="Requester tidak ditemukan."
              onChange={(nextValue) => updateFilter('requestBy', nextValue)}
            />

            <DropdownSearch
              label="Vendor"
              options={vendorOptions}
              value={currentFilters.vendor}
              placeholder="Pilih vendor"
              searchPlaceholder="Cari vendor..."
              emptyMessage="Vendor tidak ditemukan."
              onChange={(nextValue) => updateFilter('vendor', nextValue)}
            />

            <Dropdown
              label="Date"
              options={dateOptions}
              value={currentFilters.date}
              placeholder="Pilih tanggal"
              onChange={(nextValue) => updateFilter('date', nextValue)}
            />

            {children ? (
              <Box sx={{ display: 'grid', gap: 2 }}>
                {children}
              </Box>
            ) : null}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1.5 }}>
          <Button
            type="button"
            variant="outlined"
            fullWidth
            onClick={handleReset}
            sx={{
              minHeight: 44,
              borderRadius: '999px',
              borderColor: 'rgba(26, 42, 87, 0.22)',
              color: 'var(--primary-blue)',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': {
                borderColor: 'var(--secondary-blue)',
                bgcolor: 'rgba(26, 42, 87, 0.06)',
              },
            }}
          >
            Reset
          </Button>

          <Button
            type="button"
            variant="contained"
            fullWidth
            onClick={handleApply}
            sx={{
              minHeight: 44,
              borderRadius: '999px',
              bgcolor: 'var(--accent-teal)',
              boxShadow: '0 10px 24px rgba(42, 157, 143, 0.24)',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'var(--accent-teal-dark)',
                boxShadow: '0 12px 28px rgba(42, 157, 143, 0.3)',
              },
            }}
          >
            Terapkan
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  )
}

export default DrawerFilterFrp
