import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'

import { formatDraftSavedAt } from '../../services/formDraftStorage.js'

function DraftRestoredBanner({ savedAt, disabled = false, onDiscard }) {
  const savedAtLabel = formatDraftSavedAt(savedAt)

  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ mb: 2.5, alignItems: 'center', borderRadius: '8px' }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={onDiscard}
          disabled={disabled}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Buang Draft
        </Button>
      }
    >
      Melanjutkan draft{savedAtLabel ? ` yang disimpan ${savedAtLabel}` : ''}.
    </Alert>
  )
}

export default DraftRestoredBanner
