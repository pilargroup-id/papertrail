import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import { frpMobileStatusTabs } from '../../mobile/mobile-button/frp/MobileTabsFrp.jsx'

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.875rem' },
  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
}

function FrpFilter({
  filters,
  requestByOptions,
  vendorOptions,
  onFilterChange,
  id,
}) {
  return (
    <Box
      id={id}
      aria-label="Filter FRP"
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 2,
      }}
    >
      <TextField
        select
        size="small"
        label="Status"
        value={filters.status}
        onChange={(event) => onFilterChange('status', event.target.value)}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        sx={fieldSx}
      >
        {frpMobileStatusTabs.map((tab) => (
          <MenuItem key={tab.id} value={tab.id}>
            {tab.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Request By"
        value={filters.requestBy}
        onChange={(event) => onFilterChange('requestBy', event.target.value)}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        sx={fieldSx}
      >
        <MenuItem value="">All Request By</MenuItem>
        {requestByOptions.map((requestBy) => (
          <MenuItem key={requestBy} value={requestBy}>
            {requestBy}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Vendor"
        value={filters.vendor}
        onChange={(event) => onFilterChange('vendor', event.target.value)}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        sx={fieldSx}
      >
        <MenuItem value="">All Vendor</MenuItem>
        {vendorOptions.map((vendor) => (
          <MenuItem key={vendor} value={vendor}>
            {vendor}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        type="date"
        size="small"
        label="Created At"
        value={filters.createdAt}
        onChange={(event) => onFilterChange('createdAt', event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={fieldSx}
      />
    </Box>
  )
}

export default FrpFilter
