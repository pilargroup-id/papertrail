import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import { Download } from '../../layoute/TemplateIcons.jsx'

function DetailAttachmentList({ attachments, errorMessage }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Download Attachment
      </Typography>
      {attachments.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          {attachments.map(({ id, name, meta, isDownloading, onClick }) => (
            <Button
              key={id}
              variant="outlined"
              aria-label={`Download attachment ${name}`}
              disabled={isDownloading}
              onClick={onClick}
              startIcon={<Download size={18} aria-hidden="true" />}
              sx={{
                minWidth: 0,
                justifyContent: 'flex-start',
                px: 2,
                py: 1.5,
                borderColor: 'divider',
                borderRadius: '8px',
                color: 'text.primary',
                textAlign: 'left',
                textTransform: 'none',
                '& .MuiButton-startIcon': { color: 'var(--accent-teal, #2a9d8f)', flexShrink: 0, mr: 1.5 },
                '&:hover': { borderColor: 'var(--accent-teal, #2a9d8f)', bgcolor: 'rgba(42, 157, 143, 0.04)' },
              }}
            >
              <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                <Typography component="span" variant="body2" sx={{ display: 'block', fontWeight: 600 }}>
                  {name}
                </Typography>
                <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {isDownloading ? 'Mengunduh...' : meta}
                </Typography>
              </Box>
            </Button>
          ))}
        </Box>
      ) : (
        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: '8px' }}>
          <Typography variant="body2" color="text.secondary">
            Belum ada attachment.
          </Typography>
        </Box>
      )}
      {errorMessage ? <Alert severity="error" sx={{ mt: 2 }}>{errorMessage}</Alert> : null}
    </Box>
  )
}

export default DetailAttachmentList
