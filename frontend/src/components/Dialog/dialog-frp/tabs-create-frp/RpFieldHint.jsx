import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'

/**
 * Baris kecil di bawah field FRP yang menampilkan nilai dari RP + tombol salin.
 * Dipakai saat FRP dibuat dari RP. Tidak dirender jika `hint` kosong.
 */
function RpFieldHint({ hint, disabled = false }) {
  // Sembunyikan jika RP tidak punya nilai untuk field ini, supaya form tidak ramai.
  if (!hint || hint.value === undefined || hint.value === null || hint.value === '') {
    return null
  }

  const displayValue = String(hint.value)
  const canCopy = Boolean(hint.onCopy)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mt: 0.75,
        minHeight: 28,
        pl: 1,
        pr: 0.5,
        borderRadius: '6px',
        bgcolor: 'rgba(52, 73, 104, 0.04)',
      }}
    >
      <Typography
        component="span"
        sx={{
          flexShrink: 0,
          px: 0.75,
          borderRadius: '4px',
          fontSize: '0.6875rem',
          fontWeight: 700,
          lineHeight: '18px',
          color: '#344968',
          bgcolor: 'rgba(52, 73, 104, 0.1)',
        }}
      >
        RP
      </Typography>

      <Tooltip title={displayValue.length > 40 ? displayValue : ''} placement="top-start">
        <Typography
          component="span"
          variant="caption"
          sx={{
            flex: 1,
            minWidth: 0,
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayValue}
        </Typography>
      </Tooltip>

      {hint.isApplied ? (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.25,
            flexShrink: 0,
            pr: 0.75,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'success.main',
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: 14 }} />
          Sesuai RP
        </Box>
      ) : canCopy ? (
        <Button
          size="small"
          disabled={disabled}
          onClick={hint.onCopy}
          startIcon={<ContentCopyRoundedIcon sx={{ fontSize: '13px !important' }} />}
          sx={{
            flexShrink: 0,
            minWidth: 0,
            height: 24,
            px: 1,
            borderRadius: '5px',
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--accent-teal, #2a9d8f)',
            '& .MuiButton-startIcon': { mr: 0.5 },
            '&:hover': { bgcolor: 'rgba(42, 157, 143, 0.1)' },
          }}
        >
          Salin
        </Button>
      ) : null}
    </Box>
  )
}

export default RpFieldHint
