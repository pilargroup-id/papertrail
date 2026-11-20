import Typography from '@mui/material/Typography'

function SectionHeader({ title }) {
  return (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 2.5 }}>
      {title}
    </Typography>
  )
}

export default SectionHeader
