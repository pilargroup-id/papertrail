import ZoomAwarePopper from './ZoomAwarePopper.jsx'

const ACCENT_COLOR = '#344968'

export const autocompleteSlots = {
  popper: ZoomAwarePopper,
}

// Shared popup styling for every Autocomplete in the Create FRP drawer so the
// dropdown lines up with its field and matches the header colors.
export const autocompleteSlotProps = {
  chip: {
    size: 'small',
    sx: { maxWidth: 160 },
  },
  popper: {
    // Width (field width, min 320px) and desktop zoom handling live in
    // ZoomAwarePopper, passed via `autocompleteSlots`.
    placement: 'bottom-start',
    modifiers: [
      { name: 'offset', options: { offset: [0, 6] } },
      { name: 'flip', options: { fallbackPlacements: ['top-start'] } },
      { name: 'preventOverflow', options: { padding: 16 } },
    ],
  },
  paper: {
    elevation: 0,
    sx: {
      // Re-apply the app zoom cancelled on the popper (see ZoomAwarePopper).
      zoom: 'var(--app-zoom-scale, 1)',
      mt: 0,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: '8px',
      boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
      overflow: 'hidden',
      '& .MuiAutocomplete-noOptions, & .MuiAutocomplete-loading': {
        px: 1.5,
        py: 1.25,
        fontSize: '0.8125rem',
        color: 'text.secondary',
      },
    },
  },
  listbox: {
    sx: {
      maxHeight: 280,
      py: 0.5,
      '& .MuiAutocomplete-option': {
        minHeight: 'auto',
        alignItems: 'center',
        gap: 1,
        mx: 0.5,
        px: 1.25,
        py: 0.875,
        borderRadius: '6px',
        fontSize: '0.8125rem',
        lineHeight: 1.45,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        color: 'text.primary',
      },
      '& .MuiAutocomplete-option.Mui-focused': {
        bgcolor: 'rgba(52, 73, 104, 0.08)',
      },
      '& .MuiAutocomplete-option[aria-selected="true"]': {
        bgcolor: 'rgba(52, 73, 104, 0.12)',
        color: ACCENT_COLOR,
        fontWeight: 600,
      },
      '& .MuiAutocomplete-option[aria-selected="true"].Mui-focused': {
        bgcolor: 'rgba(52, 73, 104, 0.18)',
      },
    },
  },
}

export const autocompleteCheckboxSx = {
  p: 0,
  mr: 0.5,
  flexShrink: 0,
  color: 'text.secondary',
  '&.Mui-checked': { color: ACCENT_COLOR },
}
