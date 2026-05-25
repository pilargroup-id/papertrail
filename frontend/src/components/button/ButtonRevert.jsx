function ButtonRevert({
  children,
  className = '',
  tone = 'warning',
  type = 'button',
  ...buttonProps
}) {
  const toneClass = `users-table-card__action--${tone}`

  return (
    <button
      type={type}
      className={['users-table-card__action', toneClass, className].filter(Boolean).join(' ')}
      {...buttonProps}
    >
      <span className="material-icons-round" style={{ fontSize: '15px' }}>
        restart_alt
      </span>
      {children}
    </button>
  )
}

export default ButtonRevert
