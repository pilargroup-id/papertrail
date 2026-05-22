const dialogBgStyles = {
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    borderRadius: 'inherit',
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,247,251,1) 100%)',
  },

  softGlowTop: {
    position: 'absolute',
    top: '-120px',
    right: '-120px',
    width: '280px',
    height: '280px',
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(31,78,140,0.14) 0%, rgba(31,78,140,0) 70%)',
    filter: 'blur(4px)',
  },

  softGlowBottom: {
    position: 'absolute',
    left: '-110px',
    bottom: '-130px',
    width: '260px',
    height: '260px',
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(244,169,64,0.13) 0%, rgba(244,169,64,0) 72%)',
    filter: 'blur(5px)',
  },

  curve: {
    position: 'absolute',
    right: '-22%',
    bottom: '-30%',
    width: '58%',
    height: '48%',
    borderRadius: '50%',
    background:
      'radial-gradient(circle at center, rgba(214,224,236,0.5) 0%, rgba(214,224,236,0.35) 42%, rgba(214,224,236,0) 74%)',
  },

  ring: {
    position: 'absolute',
    top: '-90px',
    left: '-90px',
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    border: '16px solid rgba(31,78,140,0.06)',
  },

  dots: {
    position: 'absolute',
    top: '28px',
    right: '32px',
    width: '96px',
    height: '72px',
    opacity: 0.45,
    backgroundImage:
      'radial-gradient(rgba(31,78,140,0.22) 1.2px, transparent 1.2px)',
    backgroundSize: '14px 14px',
  },

  accentDot: {
    position: 'absolute',
    right: '42px',
    bottom: '38px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'rgba(244,169,64,0.32)',
  },
}

export default function BackgroundDialog() {
  return (
    <div aria-hidden="true" style={dialogBgStyles.root}>
      <div style={dialogBgStyles.softGlowTop} />
      <div style={dialogBgStyles.softGlowBottom} />
      <div style={dialogBgStyles.curve} />
      <div style={dialogBgStyles.ring} />
      <div style={dialogBgStyles.dots} />
      <div style={dialogBgStyles.accentDot} />
    </div>
  )
}