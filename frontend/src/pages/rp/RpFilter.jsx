import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

function RpFilter({
  filters,
  requestByOptions,
  vendorOptions,
  onFilterChange,
  id,
}) {
  return (
    <Stack
      id={id}
      className="rp-page__filters"
      direction="row"
      spacing={1}
      aria-label="Filter RP"
    >
      <TextField
        select
        fullWidth
        label="Request By"
        size="small"
        value={filters.requestBy}
        onChange={(event) => onFilterChange('requestBy', event.target.value)}
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
        fullWidth
        label="Vendor"
        size="small"
        value={filters.vendor}
        onChange={(event) => onFilterChange('vendor', event.target.value)}
      >
        <MenuItem value="">All Vendor</MenuItem>
        {vendorOptions.map((vendor) => (
          <MenuItem key={vendor} value={vendor}>
            {vendor}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  )
}

export default RpFilter
