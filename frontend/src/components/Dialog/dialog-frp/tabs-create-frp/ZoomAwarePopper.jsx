import { forwardRef } from 'react'

import Popper from '@mui/material/Popper'

// On desktop the whole app is shrunk with `html { zoom: var(--app-zoom-scale) }`
// (see styles/index.css). MUI's Popper is portaled to <body> and positioned by
// Popper.js from getBoundingClientRect(), which returns real screen pixels, so
// the inherited zoom scales its position a second time and the dropdown lands
// up-left of its field. Same fix as `.form-dropdown__menu--portal`: cancel the
// zoom on the popper itself so its coordinates are applied 1:1, size it from
// the field's on-screen width, and let the Paper inside re-apply the zoom so
// the option text stays the same size as the form.
const POPPER_OPTIONS = { strategy: 'fixed' }

function resolveAnchor(anchorEl) {
  return typeof anchorEl === 'function' ? anchorEl() : anchorEl
}

const ZoomAwarePopper = forwardRef(function ZoomAwarePopper({ anchorEl, style, ...props }, ref) {
  const anchorWidth = resolveAnchor(anchorEl)?.getBoundingClientRect?.().width

  return (
    <Popper
      ref={ref}
      anchorEl={anchorEl}
      popperOptions={POPPER_OPTIONS}
      {...props}
      style={{
        ...style,
        width: anchorWidth ?? style?.width,
        minWidth: 'calc(320px * var(--app-zoom-scale, 1))',
        zoom: 'calc(1 / var(--app-zoom-scale, 1))',
      }}
    />
  )
})

export default ZoomAwarePopper
