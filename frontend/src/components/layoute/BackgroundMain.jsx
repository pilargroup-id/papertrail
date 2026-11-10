function BackgroundMain() {
  return (
    <div aria-hidden="true" className="background-main" style={styles.root}>
      <div style={styles.topGlow} />
      <div style={styles.rightGlow} />
    </div>
  )
}

const styles = {
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
    background:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(238, 243, 249, 1) 100%)',
  },
  topGlow: {
    position: 'absolute',
    top: '4%',
    right: '8%',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(47, 111, 178, 0.22) 0%, rgba(47, 111, 178, 0) 70%)',
    filter: 'blur(6px)',
  },
  rightGlow: {
    position: 'absolute',
    top: '40%',
    right: '-10%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(244, 169, 64, 0.2) 0%, rgba(244, 169, 64, 0) 72%)',
    filter: 'blur(8px)',
  },
}

export default BackgroundMain
