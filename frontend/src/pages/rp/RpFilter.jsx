import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.875rem' },
  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
}

function RpFilter({
  filters,
  statusOptions = [],
  requestByOptions,
  vendorOptions,
  onFilterChange,
  id,
}) {
  return (
    <Box
      id={id}
      aria-label="Filter RP"
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 2,
      }}
    >
      {statusOptions.length > 0 ? (
        <TextField
          select
          size="small"
          label="Status"
          value={filters.status}
          onChange={(event) => onFilterChange('status', event.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          sx={fieldSx}
        >
          {statusOptions.map((tab) => (
            <MenuItem key={tab.id} value={tab.id}>
              {tab.label}
            </MenuItem>
          ))}
        </TextField>
      ) : null}

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
    </Box>
  )
}

export default RpFilter
