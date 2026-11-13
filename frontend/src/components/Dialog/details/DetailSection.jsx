import Box from '@mui/material/Box'

import SectionHeader from '../dialog-frp/tabs-create-frp/SectionHeader.jsx'

function DetailSection({ title, children }) {
  return (
    <Box component="section" aria-label={title} sx={{ minWidth: 0 }}>
      <SectionHeader title={title} />
      {children}
    </Box>
  )
}

export default DetailSection
