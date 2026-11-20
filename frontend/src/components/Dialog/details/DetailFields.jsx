import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'

function DetailFields({ fields }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      {fields.map(({ label, value, fullWidth = false }) => (
        <TextField
          key={label}
          fullWidth
          size="small"
          label={label}
          value={value === undefined || value === null || value === '' ? '-' : String(value)}
          multiline
          minRows={fullWidth ? 3 : 1}
          slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
          sx={{
            minWidth: 0,
            gridColumn: fullWidth ? '1 / -1' : 'auto',
            '& .MuiInputBase-root': {
              bgcolor: 'rgba(52, 73, 104, 0.02)',
              fontSize: '0.875rem',
              alignItems: 'flex-start',
            },
            '& .MuiInputBase-input': { overflowWrap: 'anywhere' },
          }}
        />
      ))}
    </Box>
  )
}

export default DetailFields
