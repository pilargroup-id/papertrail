import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'

import {
  formatRupiah,
  formatStatusLabel,
  getFirstValue,
} from '../tabs-details-rp/detailRpUtils.jsx'

function joinValues(values) {
  return values.filter(Boolean).join(' - ')
}

// Hanya info konteks RP. Field yang bisa disalin (vendor, tanggal, description, notes,
// amount item) ditampilkan langsung di dekat field FRP masing-masing.
function buildRpSummaryFields(rpDetail) {
  return [
    {
      key: 'requested_by',
      label: 'Request By',
      value: getFirstValue(rpDetail, ['requested_by_name', 'requested_by_username']),
    },
    {
      key: 'division',
      label: 'Division',
      value:
        joinValues([
          getFirstValue(rpDetail, ['department_code_snapshot'], ''),
          getFirstValue(rpDetail, ['department_name_snapshot'], ''),
        ]) || '-',
    },
    {
      key: 'for_division',
      label: 'Untuk Divisi',
      value:
        joinValues([
          getFirstValue(rpDetail, ['for_department_code_snapshot'], ''),
          getFirstValue(rpDetail, ['for_department_name_snapshot'], ''),
        ]) || '-',
    },
    {
      key: 'payment_category',
      label: 'Category Payment',
      value: getFirstValue(rpDetail, ['payment_category_name_snapshot']),
    },
    {
      key: 'pic',
      label: 'PIC',
      value: getFirstValue(rpDetail, ['pic_name']),
    },
    {
      key: 'vendor_source',
      label: 'Vendor Source',
      value: getFirstValue(rpDetail, ['vendor_source']),
    },
  ]
}

function SummaryField({ label, value }) {
  const displayValue = value === undefined || value === null || value === '' ? '-' : String(value)

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.4 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        title={displayValue}
        sx={{
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayValue}
      </Typography>
    </Box>
  )
}

function RpReferencePreview({ rpDetail, isLoading, disabled, onCopyAll }) {
  const fields = buildRpSummaryFields(rpDetail)
  const rpNumber = getFirstValue(rpDetail, ['rp_number', 'id'])
  const status = formatStatusLabel(getFirstValue(rpDetail, ['status'], ''))
  const totalAmount = formatRupiah(getFirstValue(rpDetail, ['total_amount'], ''))

  return (
    <Box
      component="section"
      sx={{
        mb: 4,
        borderRadius: '10px',
        border: '1px solid rgba(52, 73, 104, 0.16)',
        bgcolor: 'rgba(52, 73, 104, 0.03)',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          px: 2.5,
          py: 1.75,
          borderBottom: '1px solid rgba(52, 73, 104, 0.12)',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Referensi RP
          </Typography>
          {isLoading ? (
            <Skeleton width={220} height={26} />
          ) : (
            <Stack
              direction="row"
              sx={{ alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.25 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                {rpNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {status}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#344968' }}>
                {totalAmount}
              </Typography>
            </Stack>
          )}
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 16 }} />}
          disabled={disabled || isLoading || !rpDetail}
          onClick={onCopyAll}
          sx={{
            flexShrink: 0,
            height: 34,
            px: 1.75,
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            color: 'var(--accent-teal, #2a9d8f)',
            borderColor: 'rgba(42, 157, 143, 0.5)',
            bgcolor: '#fff',
            '&:hover': {
              borderColor: 'var(--accent-teal, #2a9d8f)',
              bgcolor: 'rgba(42, 157, 143, 0.06)',
            },
          }}
        >
          Salin Semua dari RP
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
          columnGap: 2.5,
          rowGap: 1.5,
          px: 2.5,
          py: 1.75,
        }}
      >
        {isLoading
          ? fields.map((field) => (
              <Box key={field.key}>
                <Skeleton width="50%" height={16} />
                <Skeleton width="80%" height={22} />
              </Box>
            ))
          : fields.map((field) => (
              <SummaryField key={field.key} label={field.label} value={field.value} />
            ))}
      </Box>
    </Box>
  )
}

export default RpReferencePreview
